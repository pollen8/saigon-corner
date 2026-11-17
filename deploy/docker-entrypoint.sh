#!/bin/sh
set -eu

pnpm --filter @app/db exec drizzle-kit migrate
exec pnpm --filter @app/server exec tsx src/index.ts