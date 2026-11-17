#!/bin/sh
set -eu

export DATABASE_URL="$(node -e "
  const user = process.env.POSTGRES_USER || 'postgres';
  const host = process.env.POSTGRES_HOST || 'postgres';
  const db = process.env.POSTGRES_DB || 'saigon_staff';
  const pass = process.env.POSTGRES_PASSWORD || '';
  if (!pass) {
    console.error('POSTGRES_PASSWORD is required');
    process.exit(1);
  }
  const enc = encodeURIComponent(pass);
  process.stdout.write(\`postgresql://\${user}:\${enc}@\${host}:5432/\${db}\`);
")"

pnpm --filter @app/db exec drizzle-kit migrate
exec pnpm --filter @app/server exec tsx src/index.ts