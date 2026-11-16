import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq, users, type Database } from "@app/db";
import * as schema from "@app/db/schema";

function getAuthSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required");
  }
  return secret;
}

export function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isAllowedAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const allowed = getAdminEmails();
  if (allowed.size === 0) {
    console.warn("ADMIN_EMAILS is empty — no sign-ins will be allowed");
    return false;
  }
  return allowed.has(email.toLowerCase());
}

export function createAuth(db: Database) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required");
  }

  return betterAuth({
    secret: getAuthSecret(),
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3100",
    trustedOrigins: [process.env.WEB_URL ?? "http://localhost:5280"],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
      usePlural: true,
    }),
    advanced: {
      database: {
        generateId: "uuid",
      },
    },
    socialProviders: {
      google: {
        clientId,
        clientSecret,
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!isAllowedAdminEmail(user.email)) {
              return false;
            }
            return { data: user };
          },
          after: async (user) => {
            await db
              .update(users)
              .set({ isAdmin: true })
              .where(eq(users.id, user.id));
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const [result] = await db
              .select({ email: users.email })
              .from(users)
              .where(eq(users.id, session.userId))
              .limit(1);
            if (!isAllowedAdminEmail(result?.email)) {
              return false;
            }
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;