FROM node:22-bookworm-slim

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/db/package.json packages/db/

RUN pnpm install --frozen-lockfile

COPY apps/server apps/server
COPY apps/web apps/web
COPY packages packages

ARG VITE_AUTH_URL=
ENV VITE_AUTH_URL=$VITE_AUTH_URL
RUN pnpm --filter @app/web build

ENV NODE_ENV=production
EXPOSE 3100

COPY deploy/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]