#!/bin/sh
set -eu

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "POSTGRES_PASSWORD is missing from .env.container" >&2
  exit 1
fi

# Ignore any leftover DATABASE_URL from env files.
unset DATABASE_URL

export DATABASE_URL="$(node --input-type=module -e "
  const user = process.env.POSTGRES_USER || 'postgres';
  const host = process.env.POSTGRES_HOST || 'postgres';
  const db = process.env.POSTGRES_DB || 'saigon_staff';
  const pass = process.env.POSTGRES_PASSWORD || '';
  const enc = encodeURIComponent(pass);
  process.stdout.write('postgresql://' + user + ':' + enc + '@' + host + ':5432/' + db);
")"

# drizzle-kit migrate must not inherit a broken DATABASE_URL from a dotenv file.
# Run from packages/db so drizzle.config.ts is found; pass URL on the process only.
cd /app/packages/db
DATABASE_URL="$DATABASE_URL" pnpm exec drizzle-kit migrate --config /app/packages/db/drizzle.config.ts
cd /app
exec env DATABASE_URL="$DATABASE_URL" pnpm --filter @app/server exec tsx src/index.ts