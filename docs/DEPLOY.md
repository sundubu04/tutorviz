# Deploying TutorViz (VPS + Docker + hosted Supabase)

Production runs **your** containers (nginx + Express) on a VPS. **Postgres and Auth** use **Supabase Cloud**—do not run `supabase start` on the server for this setup.

## 1. Server setup

1. Rent a Linux VPS (Ubuntu LTS recommended), point **DNS** for `tutorviz.org` (and `www` if needed) to the server IP.
2. Install [Docker Engine](https://docs.docker.com/engine/install/) and the [Compose plugin](https://docs.docker.com/compose/install/).
3. Clone this repo (e.g. `/var/www/tutorviz`) and add a **deploy key** so the server can `git pull` from GitHub (read-only).
4. **Environment on the server:** the deploy workflow writes **`.env`** from **individual GitHub Actions secrets** on every deploy (see below). You do not need a long-lived `.env` on disk unless you run Compose manually without Actions.

## 2. TLS (HTTPS)

Production compose runs **`nginx-edge`** on the VM’s **port 80** and **443**. The **frontend** container is **not** published to the host; it only serves **HTTP** on the Docker network to `nginx-edge` (which also proxies `/api` via the SPA container’s existing nginx rules).

### First-time Let’s Encrypt (HTTP-01, webroot)

1. Point **DNS** at the server and open **80/443** in the security group (see §1).
2. Deploy the stack: `docker compose -f docker-compose.prod.yml up -d` — the site is available on **plain HTTP** until you add HTTPS.
3. Request a certificate (replace email / domains if needed):

   ```bash
   docker compose -f docker-compose.prod.yml --profile tls run --rm certbot certonly \
     --webroot -w /var/www/certbot \
     --email you@example.com --agree-tos --no-eff-email \
     -d tutorviz.org -d www.tutorviz.org
   ```

   Use the **same first** `-d` name consistently; Let’s Encrypt stores files under `/etc/letsencrypt/live/<first-name>/` inside the **`certbot-conf`** volume.

4. Enable HTTPS on the edge:

   ```bash
   cp deploy/nginx-edge/01-https.conf.example deploy/nginx-edge/01-https.conf
   ```

   Edit **`ssl_certificate`** / **`ssl_certificate_key`** if your `live/` folder name is not `tutorviz.org`. **`01-https.conf` is gitignored** so each server can keep its own copy.

5. Reload edge nginx:

   ```bash
   docker compose -f docker-compose.prod.yml exec nginx-edge nginx -s reload
   ```

6. Optional but recommended: in [`deploy/nginx-edge/00-http.conf`](../deploy/nginx-edge/00-http.conf), replace the `location / { proxy_pass ... }` block with `location / { return 301 https://$host$request_uri; }` while keeping the **`/.well-known/acme-challenge/`** location **above** it so renewals still work.

### Renewals

Schedule twice daily (host **cron** or **systemd timer**):

```bash
docker compose -f docker-compose.prod.yml --profile tls run --rm certbot renew
docker compose -f docker-compose.prod.yml exec nginx-edge nginx -s reload
```

Test with: `docker compose -f docker-compose.prod.yml --profile tls run --rm certbot renew --dry-run`.

## 3. GitHub Actions

Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

Add these **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `SSH_HOST` | VPS hostname or IP |
| `SSH_USER` | SSH user (e.g. `deploy` or `root`) |
| `SSH_PRIVATE_KEY` | Private key for that user (PEM, `ed25519` recommended) |
| `DEPLOY_PATH` | Absolute path to the git clone on the server (e.g. `/var/www/tutorviz`) |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | Model id (e.g. `gpt-4o-mini`) |
| `DATABASE_URL` | Supabase pooled Postgres URL for the app |
| `DIRECT_URL` | Supabase direct Postgres URL (migrations) |
| `CORS_ORIGIN` | Allowed browser origin (e.g. `https://tutorviz.org`) |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SECRET_KEY` | service role key (server only) |

On each push to **`main`**, the workflow SSHs in, **writes `.env` from those secrets**, `git pull`s, **builds images**, runs **`npx prisma migrate deploy`** in a one-off backend container (uses **`DIRECT_URL`** from `.env`), then starts the stack with **`docker compose -f docker-compose.prod.yml up -d`**.

You need committed migrations under `backend/prisma/migrations/` (create them locally with `npx prisma migrate dev`). If that folder is missing or empty, `migrate deploy` fails and the deploy stops.

## 4. Environment variables

### GitHub as source of truth (recommended)

1. Use [`backend/.env.example`](../backend/.env.example) as a checklist for values (do not commit real `.env`).
2. In GitHub: **Settings → Secrets and variables → Actions**, add each secret listed in the table above (same names as environment variables).
3. Each deploy **overwrites** `$DEPLOY_PATH/.env` on the server. Update production config by editing secrets and re-running the workflow or pushing to `main`.

### Manual `.env` on the server (optional)

If you run `docker compose` on the VM without Actions, create **`.env`** next to `docker-compose.prod.yml` yourself. For Action deploys, the **eight app secrets** in the table must be set so the workflow can write `.env` before Compose runs.

### Supabase + database

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Supabase **pooled** connection string (often port `6543`, transaction mode) for the running app |
| `DIRECT_URL` | Supabase **direct** Postgres URL (port `5432`) for migrations (`prisma migrate deploy`) |
| `SUPABASE_URL` | Project URL, e.g. `https://<ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | **anon** key (exposed to the browser via `/api/supabase/config`) |
| `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | **service role** — server only |

Optional: `SUPABASE_BROWSER_URL` if the browser-visible URL differs from `SUPABASE_URL` (rare for cloud).

### App

| Variable | Example |
|----------|--------|
| `CORS_ORIGIN` | `https://tutorviz.org` |
| `NODE_ENV` | `production` (compose also sets this) |
| `PORT` | `5001` (compose sets this) |
| `OPENAI_API_KEY` | As needed |
| `OPENAI_MODEL` | As needed |

**Local development:** [`docker-compose.dev.yml`](../docker-compose.dev.yml) already sets `DIRECT_URL`. For Prisma CLI on the host, if you do not use a pooler, set `DIRECT_URL` to the **same** value as `DATABASE_URL`.

## 5. Supabase dashboard (manual)

In the [Supabase Dashboard](https://supabase.com/dashboard) → your project:

1. **Authentication → URL configuration**
   - **Site URL:** `https://tutorviz.org`
   - **Redirect URLs:** include `https://tutorviz.org/**` and any dev URLs you still use (e.g. `http://localhost:3000/**`).
2. Confirm **API** keys match your server `.env`.

## 6. Database migrations

**On each deploy**, the GitHub Action runs `prisma migrate deploy` on the VPS via Docker (after `git pull` and `docker compose … build`), using the same **`.env`** as the running app. Ensure **`DIRECT_URL`** is the Supabase **direct** Postgres URL (DDL), not the pooler-only URL.

To add or change schema locally, use `npx prisma migrate dev` in `backend/`, commit `backend/prisma/migrations/`, and push to **`main`**.

**Manual run** (debug or emergency), from the repo root on the server:

```bash
docker compose -f docker-compose.prod.yml run --rm --no-deps backend npx prisma migrate deploy
```

Or with host Node: `cd backend && set -a && source ../.env && set +a && npx prisma migrate deploy`.

## 7. Verify

- `https://tutorviz.org` serves the SPA.
- `https://tutorviz.org/api/health` returns JSON from the API.
- Sign-in works (Supabase Auth + redirect URLs).

## 8. Uploads

`backend_uploads` volume in [`docker-compose.prod.yml`](../docker-compose.prod.yml) persists `uploads/` across container restarts. Back up this volume or use object storage for durability if needed.
