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

### Google OAuth

Create OAuth credentials in Google Cloud Console. Authorized redirect URI:

`http://localhost:3100/api/auth/callback/google`

(Use your production API URL in production.)