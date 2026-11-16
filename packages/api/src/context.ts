import type { Database } from "@app/db";
import type { Auth } from "@app/auth";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  user: SessionUser;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
  };
}

export interface Context {
  db: Database;
  auth: Auth;
  session: Session | null;
}

export function createContextFactory(
  db: Database,
  auth: Auth,
  getSession: (
    headers: Record<string, string | string[] | undefined>,
  ) => Promise<Session | null>,
) {
  return async (headers: Record<string, string | string[] | undefined>) => ({
    db,
    auth,
    session: await getSession(headers),
  });
}