import {
  and,
  asc,
  desc,
  eq,
  gte,
  lte,
  actualTimeLogs,
  staffMembers,
} from "@app/db";
import { z } from "zod";
import { minutesToDuration } from "../lib/dates.js";
import {
  formatIsoDate,
  parseIsoDate,
  startOfWeekMonday,
  weekDatesFromMonday,
} from "../lib/dates.js";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../trpc.js";
import {
  assertNoOverlappingTimeLog,
  assertStaffNotOnHoliday,
} from "./schedule-assertions.js";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);

export const timeLogRouter = router({
  listForWeek: adminProcedure
    .input(
      z.object({
        weekStart: isoDateSchema,
        staffMemberId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const monday = startOfWeekMonday(parseIsoDate(input.weekStart));
      const dates = weekDatesFromMonday(monday);

      const conditions = [
        gte(actualTimeLogs.workDate, dates[0]),
        lte(actualTimeLogs.workDate, dates[6]),
      ];
      if (input.staffMemberId) {
        conditions.push(eq(actualTimeLogs.staffMemberId, input.staffMemberId));
      }

      const logs = await ctx.db
        .select({
          log: actualTimeLogs,
          staffName: staffMembers.name,
          department: staffMembers.department,
        })
        .from(actualTimeLogs)
        .innerJoin(
          staffMembers,
          eq(actualTimeLogs.staffMemberId, staffMembers.id),
        )
        .where(and(...conditions))
        .orderBy(
          desc(actualTimeLogs.workDate),
          asc(actualTimeLogs.startTime),
        );

      return {
        weekStart: formatIsoDate(monday),
        dates,
        logs,
      };
    }),

  listForRange: adminProcedure
    .input(
      z.object({
        startDate: isoDateSchema,
        endDate: isoDateSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      const start = parseIsoDate(input.startDate);
      const end = parseIsoDate(input.endDate);
      if (end < start) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End date must be on or after start date",
        });
      }

      const logs = await ctx.db
        .select({
          log: actualTimeLogs,
          staffName: staffMembers.name,
          department: staffMembers.department,
        })
        .from(actualTimeLogs)
        .innerJoin(
          staffMembers,
          eq(actualTimeLogs.staffMemberId, staffMembers.id),
        )
        .where(
          and(
            gte(actualTimeLogs.workDate, input.startDate),
            lte(actualTimeLogs.workDate, input.endDate),
          ),
        )
        .orderBy(
          asc(actualTimeLogs.workDate),
          asc(staffMembers.name),
          asc(actualTimeLogs.startTime),
        );

      return { startDate: input.startDate, endDate: input.endDate, logs };
    }),

  create: adminProcedure
    .input(
      z.object({
        staffMemberId: z.string().uuid(),
        workDate: isoDateSchema,
        startTime: timeSchema,
        endTime: timeSchema,
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const duration = minutesToDuration(input.startTime, input.endTime);
      if (duration <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time",
        });
      }
      await assertStaffNotOnHoliday(
        ctx.db,
        input.staffMemberId,
        input.workDate,
      );
      await assertNoOverlappingTimeLog(
        ctx.db,
        input.staffMemberId,
        input.workDate,
        input.startTime,
        input.endTime,
      );
      const [row] = await ctx.db
        .insert(actualTimeLogs)
        .values({
          staffMemberId: input.staffMemberId,
          workDate: input.workDate,
          startTime: input.startTime,
          endTime: input.endTime,
          notes: input.notes,
        })
        .returning();
      return row;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        startTime: timeSchema.optional(),
        endTime: timeSchema.optional(),
        notes: z.string().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(actualTimeLogs)
        .where(eq(actualTimeLogs.id, input.id));

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Time log not found." });
      }

      const startTime = input.startTime ?? existing.startTime;
      const endTime = input.endTime ?? existing.endTime;
      const duration = minutesToDuration(startTime, endTime);
      if (duration <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time",
        });
      }

      await assertNoOverlappingTimeLog(
        ctx.db,
        existing.staffMemberId,
        String(existing.workDate),
        startTime,
        endTime,
        existing.id,
      );

      const { id, ...patch } = input;
      const [row] = await ctx.db
        .update(actualTimeLogs)
        .set(patch)
        .where(eq(actualTimeLogs.id, id))
        .returning();
      return row;
    }),

  remove: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(actualTimeLogs).where(eq(actualTimeLogs.id, input.id));
      return { ok: true as const };
    }),
});