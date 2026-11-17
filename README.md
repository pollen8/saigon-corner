# Saigon Corner — staff scheduling

Haven-style monorepo (React + Mantine, Fastify + tRPC, PostgreSQL) for cafe staff rosters and actual hours.

## Features

- Google sign-in for admin only (`ADMIN_EMAILS`)
- Staff list (front of house / kitchen)
- Opening hours with multiple windows per weekday
- Weekly roster grid (staff × Mon–Sun) with hour blocks
- Per-staff weekly shift breakdown
- Log actual hours worked

## Setup

```bash
cp .env.example .env
# Set DATABASE_URL, BETTER_AUTH_SECRET, ADMIN_EMAILS, Google OAuth credentials

docker compose up -d   # optional Postgres

pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Web: `http://localhost:5280` · API: `http://localhost:3100`

### Install on phone (PWA)

Production builds include a web app manifest and service worker (app shell only — roster and auth still need the network).

1. Deploy with `NODE_ENV=production` so the API serves `apps/web/dist` over **HTTPS** on one origin.
2. Set `WEB_URL` and `BETTER_AUTH_URL` to that public URL and add it to Better Auth `trustedOrigins` (via `WEB_URL`).
3. On Android Chrome or iOS Safari, open the site and use **Install app** / **Add to Home Screen**.

For a new release, users who installed the PWA may see a prompt to reload when an updated build is available.

### Google OAuth

Create OAuth credentials in Google Cloud Console. Authorized redirect URI:

`http://localhost:3100/api/auth/callback/google`

(Use your production API URL in production.)

## Production (DigitalOcean droplet)

Same pattern as the [Haven](https://github.com/pollen8/haven) repo: a **Droplet** in London, **Docker Compose** (Postgres + app + Caddy), HTTPS on one hostname, and optional **GitHub Actions** deploy on push to `main`. Haven’s step-by-step wizard is `scripts/setup-droplet-prod.sh` there—follow it but swap repo path, domain, and env for this app.

### What runs on the server

| Service | Role |
|--------|------|
| **Postgres 16** | Database `saigon_staff` |
| **app** | `pnpm build` web + Fastify on port 3100 (`NODE_ENV=production` serves the SPA) |
| **Caddy** | TLS and `reverse_proxy` to `app:3100` |

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Local dev Postgres only |
| `docker-compose.prod.yml` | Droplet: Postgres + app (no Caddy) |
| `Dockerfile` | Build web + run API with migrations on start |
| `deploy/env.example` | Template for `/opt/saigon-staff/.env` |
| `deploy/Caddyfile.snippet` | Site block for Haven’s Caddy on the same droplet |

On the shared Haven droplet, Caddy stays in `/opt/haven`; wire this app with `deploy/Caddyfile.snippet`.

Typical app directory: `/opt/saigon-staff` (or your choice).

### Droplet env (`.env` on the server)

Copy from `.env.example` and set production values:

```bash
NODE_ENV=production
PORT=3100
POSTGRES_PASSWORD=…          # used by compose for Postgres + DATABASE_URL
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/saigon_staff
BETTER_AUTH_SECRET=…         # openssl rand -base64 32
BETTER_AUTH_URL=https://saigon-corner.pollen-8.co.uk
WEB_URL=https://saigon-corner.pollen-8.co.uk
ADMIN_EMAILS=you@gmail.com,other@…
GOOGLE_CLIENT_ID=…
GOOGLE_CLIENT_SECRET=…
```

Google OAuth redirect URI (production):

`https://saigon-corner.pollen-8.co.uk/api/auth/callback/google`

DNS: **A record** for your hostname → droplet IPv4 (certificate issuance needs DNS working first).

### First-time bootstrap (on the droplet)

After creating the droplet (Ubuntu, SSH, firewall 22/80/443), install Docker and clone the repo. Haven’s `deploy/bootstrap.sh` automates clone, UFW, and `docker compose up -d --build`. Equivalent manual flow:

```bash
# On the droplet as root (after .env is in /opt/saigon-staff/.env)
cd /opt/saigon-staff
git fetch origin main
git checkout main
git reset --hard origin/main
docker compose -f docker-compose.prod.yml up -d --build
docker network connect haven_default saigon-staff-app   # once, or after recreate
```

Add `deploy/Caddyfile.snippet` to `/opt/haven/Caddyfile`, then reload Caddy. Check `https://saigon-corner.pollen-8.co.uk/health`.

### Deploy updates

**GitHub Actions** (`.github/workflows/deploy.yml`): SSH to the droplet, `git fetch` + `reset --hard origin/main`, then `docker compose -f docker-compose.prod.yml up -d --build`. Secrets: `DROPLET_HOST`, `DROPLET_USER`, `DROPLET_SSH_KEY` (GitHub **production** environment).

**By hand:**

```bash
ssh -i ~/.ssh/your-deploy-key root@YOUR_DROPLET_IP
cd /opt/saigon-staff
git fetch origin main
git reset --hard origin/main
docker compose -f docker-compose.prod.yml up -d --build
```

`--build` rebuilds the app image; Postgres keeps running.

### Migrations

Migrations run on app container start (`drizzle-kit migrate` in the entrypoint, Haven-style). To run manually:

```bash
cd /opt/saigon-staff
docker compose -f docker-compose.prod.yml exec app pnpm --filter @app/db exec drizzle-kit migrate
```

If a migration was added out of order and Drizzle skips it, apply the SQL by hand and insert a row into `drizzle.__drizzle_migrations` (see Haven **Production** in its README for the exact pattern).

### PWA on the droplet

With HTTPS and a single origin (`WEB_URL` = `BETTER_AUTH_URL`), staff can use **Install app** on Android/iOS once production is live.