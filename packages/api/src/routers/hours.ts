import { asc, eq, operatingHoursPeriods } from "@app/db";
import { z } from "zod";
import { adminProcedure, router } from "../trpc.js";

const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/);

export const hoursRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(operatingHoursPeriods)
      .orderBy(asc(operatingHoursPeriods.dayOfWeek), asc(operatingHoursPeriods.sortOrder));
  }),

  addPeriod: adminProcedure
    .input(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        openTime: timeSchema,
        closeTime: timeSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ sortOrder: operatingHoursPeriods.sortOrder })
        .from(operatingHoursPeriods)
        .where(eq(operatingHoursPeriods.dayOfWeek, input.dayOfWeek));
      const nextOrder =
        existing.length > 0
          ? Math.max(...existing.map((row) => row.sortOrder)) + 1
          : 0;

      const [row] = await ctx.db
        .insert(operatingHoursPeriods)
        .values({
          dayOfWeek: input.dayOfWeek,
          openTime: input.openTime,
          closeTime: input.closeTime,
          sortOrder: nextOrder,
        })
        .returning();
      return row;
    }),

  updatePeriod: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        openTime: timeSchema.optional(),
        closeTime: timeSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      const [row] = await ctx.db
        .update(operatingHoursPeriods)
        .set(patch)
        .where(eq(operatingHoursPeriods.id, id))
        .returning();
      return row;
    }),

  removePeriod: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(operatingHoursPeriods)
        .where(eq(operatingHoursPeriods.id, input.id));
      return { ok: true as const };
    }),
});