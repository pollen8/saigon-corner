import {
  asc,
  eq,
  staffMembers,
} from "@app/db";
import { z } from "zod";
import { adminProcedure, router } from "../trpc.js";

const departmentSchema = z.enum(["foh", "kitchen"]);

export const staffRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(staffMembers)
      .orderBy(asc(staffMembers.sortOrder), asc(staffMembers.name));
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(255),
        department: departmentSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(staffMembers)
        .values({
          name: input.name,
          department: input.department,
        })
        .returning();
      return row;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(255).optional(),
        department: departmentSchema.optional(),
        active: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      const [row] = await ctx.db
        .update(staffMembers)
        .set(patch)
        .where(eq(staffMembers.id, id))
        .returning();
      return row;
    }),

  remove: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(staffMembers).where(eq(staffMembers.id, input.id));
      return { ok: true as const };
    }),
});