import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

import { pool, ImageRow, UserRow } from './db';
import { currentUser, redirectIfAuthed, requireLogin } from './auth';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' },
  })
);

// Escape <, >, &, ' and " (JSON_HEX_TAG|AMP|APOS|QUOT) while keeping slashes.
// Used to inline the catalog into a <script> tag, like the PHP original.
function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, '\\u0027')
    .replace(/"/g, '\\u0022');
}
app.locals.safeJson = safeJson;

// ---- Upload (image only — no name or other fields) ----
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const base = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '');
      cb(null, `${Date.now()}_${base}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    cb(null, ALLOWED_EXT.includes(ext));
  },
});

app.post('/upload', requireLogin, upload.single('image'), async (req, res) => {
  const user = currentUser(req);
  if (user && req.file && req.file.size > 0) {
    const title = path.parse(req.file.originalname).name;
    await pool.query('INSERT INTO images (user_id, file_name, title) VALUES (?, ?, ?)', [
      user.id,
      req.file.filename,
      title,
    ]);
  }
  res.redirect('/');
});

// ---- Dashboard (my images: search + sort) ----
app.get('/', requireLogin, async (req, res) => {
  const user = currentUser(req)!;

  // Sort (whitelist)
  const sort = String(req.query.sort ?? 'newest');
  const orderByMap: Record<string, string> = {
    newest: 'created_at DESC',
    oldest: 'created_at ASC',
    name: 'title ASC',
    'name-desc': 'title DESC',
  };
  const orderBy = orderByMap[sort] ?? 'created_at DESC';

  // Search my images
  const q = String(req.query.q ?? '').trim();

  let sql = 'SELECT * FROM images WHERE user_id = ?';
  const params: (string | number)[] = [user.id];
  if (q !== '') {
    sql += ' AND (title LIKE ? OR file_name LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like);
  }
  sql += ` ORDER BY ${orderBy}`;

  const [rows] = await pool.query(sql, params);
  const images = rows as ImageRow[];

  const catalog = images.map((img) => ({
    src: `uploads/${img.file_name}`,
    title: img.title,
  }));

  res.render('index', { user, images, q, sort, catalog });
});

// ---- Favorites page ----
app.get('/favorites', requireLogin, async (req, res) => {
  const user = currentUser(req)!;

  const [rows] = await pool.query(
    "SELECT title, file_name FROM images WHERE user_id = ? AND file_name IS NOT NULL AND file_name != ''",
    [user.id]
  );
  const images = rows as ImageRow[];

  const catalog = images.map((img) => ({
    src: `uploads/${img.file_name}`,
    title: img.title,
  }));

  res.render('favorites', { user, catalog });
});

// ---- Rename (edit) ----
app.get('/edit/:id', requireLogin, async (req, res) => {
  const user = currentUser(req)!;
  const id = Number(req.params.id);

  const [rows] = await pool.query('SELECT * FROM images WHERE id = ? AND user_id = ?', [id, user.id]);
  const img = (rows as ImageRow[])[0];
  if (!img) {
    res.status(404);
    return res.render('not-found');
  }

  res.render('edit', { user, img, error: '' });
});

app.post('/edit/:id', requireLogin, async (req, res) => {
  const user = currentUser(req)!;
  const id = Number(req.params.id);

  const [rows] = await pool.query('SELECT * FROM images WHERE id = ? AND user_id = ?', [id, user.id]);
  const img = (rows as ImageRow[])[0];
  if (!img) {
    res.status(404);
    return res.render('not-found');
  }

  const title = String(req.body.title ?? '').trim();
  if (title === '') {
    return res.render('edit', { user, img, error: 'Image name cannot be empty.' });
  }

  await pool.query('UPDATE images SET title = ? WHERE id = ? AND user_id = ?', [title, id, user.id]);
  res.redirect('/');
});

// ---- Delete (file + row, owner only) ----
app.get('/delete/:id', requireLogin, async (req, res) => {
  const user = currentUser(req)!;
  const id = Number(req.params.id);

  const [rows] = await pool.query('SELECT file_name FROM images WHERE id = ? AND user_id = ?', [
    id,
    user.id,
  ]);
  const img = (rows as ImageRow[])[0];

  if (img) {
    const filePath = path.join(UPLOADS_DIR, img.file_name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    await pool.query('DELETE FROM images WHERE id = ? AND user_id = ?', [id, user.id]);
  }

  res.redirect('/');
});

// ---- Auth: login ----
app.get('/login', redirectIfAuthed, (_req, res) => {
  res.render('login', { error: '', email: '' });
});

app.post('/login', redirectIfAuthed, async (req, res) => {
  const email = String(req.body.email ?? '').trim();
  const password = String(req.body.password ?? '');

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  const user = (rows as UserRow[])[0];

  if (user && (await bcrypt.compare(password, user.password))) {
    req.session.user = { id: Number(user.id), name: user.name, email: user.email };
    return res.redirect('/');
  }

  res.render('login', { error: 'Invalid email or password.', email });
});

// ---- Auth: register ----
app.get('/register', redirectIfAuthed, (_req, res) => {
  res.render('register', { error: '', name: '', email: '' });
});

app.post('/register', redirectIfAuthed, async (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const email = String(req.body.email ?? '').trim();
  const password = String(req.body.password ?? '');

  if (name === '' || email === '' || password === '') {
    return res.render('register', { error: 'Name, email and password are required.', name, email });
  }

  const hashed = await bcrypt.hash(password, 10);
  try {
    const [result] = await pool.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [
      name,
      email,
      hashed,
    ]);
    const id = Number((result as { insertId: number }).insertId);
    req.session.user = { id, name, email };
    res.redirect('/');
  } catch {
    res.render('register', {
      error: 'Could not create account. That email may already be registered.',
      name,
      email,
    });
  }
});

// ---- Auth: logout ----
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.listen(PORT, () => {
  console.log(`Gallery listening on http://localhost:${PORT}`);
});
