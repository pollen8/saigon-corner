#!/bin/sh
set -eu

if [ -f "${POSTGRES_PASSWORD_FILE:-}" ]; then
  POSTGRES_PASSWORD="$(tr -d '\r\n' < "$POSTGRES_PASSWORD_FILE")"
  export POSTGRES_PASSWORD
fi

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "POSTGRES_PASSWORD is empty. Put one line in secrets/postgres_password" >&2
  exit 1
fi

unset DATABASE_URL

export DATABASE_URL="$(node --input-type=module -e "
  const user = process.env.POSTGRES_USER || 'postgres';
  const host = process.env.POSTGRES_HOST || 'postgres';
  const db = process.env.POSTGRES_DB || 'saigon_staff';
  const pass = process.env.POSTGRES_PASSWORD || '';
  const enc = encodeURIComponent(pass);
  process.stdout.write('postgresql://' + user + ':' + enc + '@' + host + ':5432/' + db);
")"

cd /app/packages/db
DATABASE_URL="$DATABASE_URL" pnpm exec drizzle-kit migrate --config /app/packages/db/drizzle.config.ts
cd /app
exec env DATABASE_URL="$DATABASE_URL" pnpm --filter @app/server exec tsx src/index.ts