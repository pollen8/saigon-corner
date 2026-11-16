import { fromNodeHeaders } from "better-auth/node";
import { eq, users, type Database } from "@app/db";
import { getAdminEmails, type Auth } from "./auth.js";

export function createAuthRouteHandler(auth: Auth) {
  return async (request: {
    url: string;
    method: string;
    headers: Record<string, string | string[] | undefined>;
    body?: unknown;
  }) => {
    const url = new URL(
      request.url,
      `http://${request.headers.host ?? "localhost"}`,
    );
    const headers = fromNodeHeaders(request.headers);
    const body =
      request.method !== "GET" && request.method !== "HEAD" && request.body
        ? JSON.stringify(request.body)
        : undefined;

    const req = new Request(url.toString(), {
      method: request.method,
      headers,
      body,
    });

    return auth.handler(req);
  };
}

export async function getSession(
  auth: Auth,
  db: Database,
  headers: Record<string, string | string[] | undefined>,
) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(headers),
  });

  if (!session?.user?.id) {
    return null;
  }

	const allowed = getAdminEmails();
	const email = session.user.email?.toLowerCase();
	if (!email || !allowed.has(email)) {
		return null;
	}

	const [user] = await db
		.select({ isAdmin: users.isAdmin })
		.from(users)
		.where(eq(users.id, session.user.id))
		.limit(1);

	if (!user?.isAdmin) {
		await db
			.update(users)
			.set({ isAdmin: true })
			.where(eq(users.id, session.user.id));
	}

	return {
		...session,
		user: {
			...session.user,
			image: session.user.image ?? null,
			isAdmin: true,
		},
	};
}