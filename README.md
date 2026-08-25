# Gallery (Node.js + TypeScript)

A faithful port of the original PHP gallery app — same features and UI — running on
**Node.js, Express, EJS and MySQL**. All Docker/Kubernetes/CI files were dropped.

## Features

- Register / login / logout (session-based, bcrypt password hashing)
- Upload images (JPG, PNG, GIF, WebP only)
- Search your images (title or filename)
- Sort: newest, oldest, name A–Z, name Z–A
- Rename image titles (owner only)
- Delete images (file + row, owner only)
- Favorites stored per-browser in `localStorage`
- In-page image lightbox viewer

## Requirements

- Node.js 18+
- A MySQL server (database + tables created from `schema.sql`)

## Setup

1. Create the database and tables:

   ```sh
   mysql -u root -p < schema.sql
   ```

   (or paste `schema.sql` into your MySQL client / phpMyAdmin)

2. Configure the connection:

   ```sh
   copy .env.example .env
   ```

   Defaults match the original app: `DB_NAME=userdb`, `DB_USER=appuser`,
   `DB_PASS=apppass`, host `localhost`.

3. Install and run:

   ```sh
   npm install
   npm run dev      # development (auto-reload)
   # or
   npm run build && npm start   # production
   ```

4. Open http://localhost:3000 — create an account and start uploading.

## Run with Docker (recommended)

Requires Docker Desktop (or Docker Engine + Compose).

```sh
docker compose up --build
```

- App: http://localhost:3000
- MySQL: `localhost:3306` (`userdb` / `appuser` / `apppass`, root password `rootpass`)
- `schema.sql` is applied automatically on first boot.

### Where your data lives

Both volumes are host folders inside this project, so data survives container
restarts and removals:

| Host folder        | Mounted at          | Contains                        |
| ------------------ | ------------------- | ------------------------------- |
| `mysql-data/`      | `/var/lib/mysql`    | All SQL data (users, images)    |
| `upload-data/`     | `/app/uploads`      | Uploaded image files            |

### Backing up

1. Stop the app: `docker compose down`
2. Copy the two folders somewhere safe (`mysql-data/` and `upload-data/`).
   Restore later by putting them back and running `docker compose up`.

Or back up the SQL while running:

```sh
docker compose exec db sh -c "mysqldump -u root -prootpass userdb" > backup.sql
```

## Project layout

```
src/server.ts   Express app + all routes
src/db.ts       MySQL connection pool
src/auth.ts     session auth helpers
views/          EJS templates (login, register, index, favorites, edit, not-found)
public/         style.css, favorites.js, viewer.js (copied verbatim from the PHP app)
uploads/        uploaded image files (created automatically)
schema.sql      MySQL schema (unchanged)
```
