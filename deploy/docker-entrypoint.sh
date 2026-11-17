#!/bin/sh
set -eu

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "POSTGRES_PASSWORD is missing. Set it in .env (quote values that contain \$ or %)." >&2
  exit 1
fi

export DATABASE_URL="$(node -e "
  const user = process.env.POSTGRES_USER || 'postgres';
  const host = process.env.POSTGRES_HOST || 'postgres';
  const db = process.env.POSTGRES_DB || 'saigon_staff';
  const pass = process.env.POSTGRES_PASSWORD || '';
  const enc = encodeURIComponent(pass);
  process.stdout.write(\`postgresql://\${user}:\${enc}@\${host}:5432/\${db}\`);
")"

node -e "
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  client
    .connect()
    .then(() => client.end())
    .catch((err) => {
      console.error('Postgres connection check failed:', err.message);
      console.error('Hint: POSTGRES_PASSWORD in .env must match the DB volume. Quote the value if it contains \\$, %, or £. Or run: docker compose -f docker-compose.prod.yml down -v && up -d');
      process.exit(1);
    });
"

pnpm --filter @app/db exec drizzle-kit migrate
exec pnpm --filter @app/server exec tsx src/index.ts