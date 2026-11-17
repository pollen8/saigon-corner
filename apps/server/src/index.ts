import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type AppRouter, appRouter, createContextFactory } from "@app/api";
import { createAuth, createAuthRouteHandler, getSession } from "@app/auth/server";
import { createDb } from "@app/db";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import {
  type FastifyTRPCPluginOptions,
  fastifyTRPCPlugin,
} from "@trpc/server/adapters/fastify";
import { config } from "dotenv";
import fastify from "fastify";

config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env"),
});

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const db = createDb(DATABASE_URL);
const auth = createAuth(db);
const handleAuthRequest = createAuthRouteHandler(auth);

const server = fastify({
  routerOptions: { maxParamLength: 5000 },
  logger: true,
  trustProxy: true,
});

await server.register(cors, {
  origin: true,
  credentials: true,
});

server.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
    try {
      const response = await handleAuthRequest({
        url: request.url,
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      reply.status(response.status);
      for (const [key, value] of response.headers) {
        reply.header(key, value);
      }
      reply.send(response.body ? await response.text() : null);
    } catch (error) {
      server.log.error(error);
      reply.status(500).send({
        error: "Internal authentication error",
        code: "AUTH_FAILURE",
      });
    }
  },
});

const createContext = createContextFactory(db, auth, (headers) =>
  getSession(auth, db, headers),
);

await server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext: ({ req }) => createContext(req.headers),
    onError({ path, error }) {
      console.error(`Error in tRPC handler on path '${path}':`, error);
    },
  } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
});

server.get("/health", async () => ({ status: "ok" }));

if (process.env.NODE_ENV === "production") {
  const webDist = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../web/dist",
  );

  await server.register(fastifyStatic, {
    root: webDist,
    wildcard: false,
  });

  server.setNotFoundHandler((request, reply) => {
    const url = request.raw.url ?? "";
    if (
      url.startsWith("/trpc") ||
      url.startsWith("/api") ||
      url.startsWith("/health")
    ) {
      return reply.status(404).send({ error: "Not found" });
    }
    return reply.sendFile("index.html");
  });
} else {
  server.get("/", async () => ({
    name: "Saigon Corner Staff API",
    web: process.env.WEB_URL ?? "http://localhost:5280",
    health: "/health",
    trpc: "/trpc",
    auth: "/api/auth",
  }));
}

const port = Number(process.env.PORT) || 3100;

try {
  await server.listen({ port, host: "0.0.0.0" });
  console.log(`Server listening on http://localhost:${port}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}