#!/bin/sh
set -eu

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "POSTGRES_PASSWORD is missing. Set it in .env (quote values that contain \$ or %)." >&2
  exit 1
fi

unset DATABASE_URL 2>/dev/null || true
export DATABASE_URL="$(node -e "
  const user = process.env.POSTGRES_USER || 'postgres';
  const host = process.env.POSTGRES_HOST || 'postgres';
  const db = process.env.POSTGRES_DB || 'saigon_staff';
  const pass = process.env.POSTGRES_PASSWORD || '';
  const enc = encodeURIComponent(pass);
  process.stdout.write(\`postgresql://\${user}:\${enc}@\${host}:5432/\${db}\`);
")"

DATABASE_URL="$DATABASE_URL" pnpm --filter @app/db exec drizzle-kit migrate
exec env DATABASE_URL="$DATABASE_URL" pnpm --filter @app/server exec tsx src/index.ts