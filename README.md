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

1. Create your local config — never commit it (it is gitignored):

   ```sh
   copy .env.example .env
   ```

   Fill in real values for the passwords and `SESSION_SECRET`.

2. Start the stack:

   ```sh
   docker compose up --build
   ```

- App: http://localhost:3000
- MySQL: `localhost:3306`
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
docker compose exec db sh -c "mysqldump -u root -p$MYSQL_ROOT_PASSWORD userdb" > backup.sql
```

## CI/CD pipeline (GitHub Actions)

`.github/workflows/main.yml` runs on every push to `main`, as four separate jobs:

1. **lint** — install dependencies + TypeScript typecheck
2. **build** — compile the app and build the Docker image
3. **deploy** — boot the full stack (MySQL + app), health-check it, tear down
4. **publish** — log in to Docker Hub and push `latest` + commit-SHA tags

### Required GitHub secrets

Set these in **Settings → Secrets and variables → Actions**
(never put them in code or `.env.example`):

| Secret                 | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| `DOCKERHUB_USERNAME`   | Docker Hub account (e.g. `tasniapia`)     |
| `DOCKERHUB_TOKEN`      | Docker Hub access token (PAT)             |
| `MYSQL_ROOT_PASSWORD`  | MySQL root password                       |
| `MYSQL_DATABASE`       | Database name (e.g. `userdb`)             |
| `MYSQL_USER`           | App DB user (e.g. `appuser`)              |
| `MYSQL_PASSWORD`       | App DB user password                      |
| `SESSION_SECRET`       | Long random string for session signing    |

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
