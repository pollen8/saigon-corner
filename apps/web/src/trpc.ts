import type { AppRouter } from "@app/api";
import { httpBatchLink } from "@trpc/client";
import { type CreateTRPCReact, createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

export const trpc: CreateTRPCReact<AppRouter, unknown> =
  createTRPCReact<AppRouter>();

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/trpc",
        transformer: superjson,
        fetch(url, options) {
          return fetch(url, { ...options, credentials: "include" });
        },
      }),
    ],
  });
}