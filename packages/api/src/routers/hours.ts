import { asc, eq, operatingHoursPeriods } from "@app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../trpc.js";

const dayOfWeekSchema = z.number().int().min(0).max(6);

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

  copyDayToDays: adminProcedure
    .input(
      z.object({
        fromDayOfWeek: dayOfWeekSchema,
        targetDays: z.array(dayOfWeekSchema).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const targetDays = [
        ...new Set(
          input.targetDays.filter((day) => day !== input.fromDayOfWeek),
        ),
      ];
      if (targetDays.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Choose at least one other day.",
        });
      }

      const source = await ctx.db
        .select({
          openTime: operatingHoursPeriods.openTime,
          closeTime: operatingHoursPeriods.closeTime,
          sortOrder: operatingHoursPeriods.sortOrder,
        })
        .from(operatingHoursPeriods)
        .where(eq(operatingHoursPeriods.dayOfWeek, input.fromDayOfWeek))
        .orderBy(asc(operatingHoursPeriods.sortOrder));

      if (source.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This day has no opening hours to copy.",
        });
      }

      for (const targetDay of targetDays) {
        await ctx.db
          .delete(operatingHoursPeriods)
          .where(eq(operatingHoursPeriods.dayOfWeek, targetDay));

        for (const period of source) {
          await ctx.db.insert(operatingHoursPeriods).values({
            dayOfWeek: targetDay,
            openTime: period.openTime,
            closeTime: period.closeTime,
            sortOrder: period.sortOrder,
          });
        }
      }

      return { copiedTo: targetDays.length, windows: source.length };
    }),
});