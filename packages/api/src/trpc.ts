import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context.js";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

const enforceAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.isAdmin) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session!,
      user: ctx.session!.user,
    },
  });
});

export const adminProcedure = t.procedure.use(enforceAdmin);