/// <reference path="./vite-env.d.ts" />

import { createAuthClient, type ReactAuthClient } from "better-auth/react";

type AuthClientOptions = {
  baseURL: string;
  fetchOptions: {
    credentials: "include";
  };
};

export function authBaseUrl(): string {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return "";
    }
  }

  if (import.meta.env.VITE_AUTH_URL) {
    return import.meta.env.VITE_AUTH_URL;
  }

  if (import.meta.env.PROD) {
    return "";
  }

  return "http://localhost:3100";
}

export const authClient: ReactAuthClient<AuthClientOptions> = createAuthClient({
  baseURL: authBaseUrl(),
  fetchOptions: {
    credentials: "include",
  },
});

export type Session = typeof authClient.$Infer.Session;