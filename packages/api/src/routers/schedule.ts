import {
  and,
  asc,
  eq,
  gte,
  lte,
  operatingHoursPeriods,
  scheduledShifts,
  staffMembers,
  type Database,
} from "@app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  dayOfWeekFromIso,
  formatIsoDate,
  minutesToDuration,
  parseIsoDate,
  startOfWeekMonday,
  weekDatesFromMonday,
} from "../lib/dates.js";
import {
  openingHoursMessage,
  shiftWithinOpeningHours,
} from "../lib/opening-hours.js";
import { adminProcedure, router } from "../trpc.js";

async function periodsForDate(db: Database, workDate: string) {
  const dayOfWeek = dayOfWeekFromIso(workDate);
  return db
    .select({
      openTime: operatingHoursPeriods.openTime,
      closeTime: operatingHoursPeriods.closeTime,
    })
    .from(operatingHoursPeriods)
    .where(eq(operatingHoursPeriods.dayOfWeek, dayOfWeek))
    .orderBy(asc(operatingHoursPeriods.sortOrder));
}

async function assertShiftAllowed(
  db: Database,
  workDate: string,
  startTime: string,
  endTime: string,
) {
  const periods = await periodsForDate(db, workDate);
  if (minutesToDuration(startTime, endTime) <= 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "End time must be after start time.",
    });
  }
  if (!shiftWithinOpeningHours(periods, startTime, endTime)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: openingHoursMessage(periods),
    });
  }
}

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);

export const scheduleRouter = router({
  week: adminProcedure
    .input(
      z.object({
        weekStart: isoDateSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      const monday = startOfWeekMonday(parseIsoDate(input.weekStart));
      const dates = weekDatesFromMonday(monday);
      const rangeStart = dates[0];
      const rangeEnd = dates[6];

      const [staff, shifts, hours] = await Promise.all([
        ctx.db
          .select()
          .from(staffMembers)
          .where(eq(staffMembers.active, true))
          .orderBy(asc(staffMembers.sortOrder), asc(staffMembers.name)),
        ctx.db
          .select()
          .from(scheduledShifts)
          .where(
            and(
              gte(scheduledShifts.workDate, rangeStart),
              lte(scheduledShifts.workDate, rangeEnd),
            ),
          )
          .orderBy(asc(scheduledShifts.workDate), asc(scheduledShifts.startTime)),
        ctx.db
          .select()
          .from(operatingHoursPeriods)
          .orderBy(
            asc(operatingHoursPeriods.dayOfWeek),
            asc(operatingHoursPeriods.sortOrder),
          ),
      ]);

      const hoursByDay = new Map<number, typeof hours>();
      for (const period of hours) {
        const list = hoursByDay.get(period.dayOfWeek) ?? [];
        list.push(period);
        hoursByDay.set(period.dayOfWeek, list);
      }

      return {
        weekStart: formatIsoDate(monday),
        dates,
        staff,
        shifts,
        operatingHoursByDay: Object.fromEntries(
          dates.map((iso) => [iso, hoursByDay.get(dayOfWeekFromIso(iso)) ?? []]),
        ),
      };
    }),

  assignShift: adminProcedure
    .input(
      z.object({
        staffMemberId: z.string().uuid(),
        workDate: isoDateSchema,
        startTime: timeSchema,
        endTime: timeSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertShiftAllowed(
        ctx.db,
        input.workDate,
        input.startTime,
        input.endTime,
      );

      const [row] = await ctx.db
        .insert(scheduledShifts)
        .values({
          staffMemberId: input.staffMemberId,
          workDate: input.workDate,
          startTime: input.startTime,
          endTime: input.endTime,
        })
        .returning();
      return row;
    }),

  updateShift: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        startTime: timeSchema.optional(),
        endTime: timeSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(scheduledShifts)
        .where(eq(scheduledShifts.id, input.id));

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shift not found." });
      }

      const startTime = input.startTime ?? existing.startTime;
      const endTime = input.endTime ?? existing.endTime;
      await assertShiftAllowed(
        ctx.db,
        String(existing.workDate),
        startTime,
        endTime,
      );

      const { id, ...patch } = input;
      const [row] = await ctx.db
        .update(scheduledShifts)
        .set(patch)
        .where(eq(scheduledShifts.id, id))
        .returning();
      return row;
    }),

  removeShift: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(scheduledShifts)
        .where(eq(scheduledShifts.id, input.id));
      return { ok: true as const };
    }),

  staffDetail: adminProcedure
    .input(
      z.object({
        staffMemberId: z.string().uuid(),
        weekStart: isoDateSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      const monday = startOfWeekMonday(parseIsoDate(input.weekStart));
      const dates = weekDatesFromMonday(monday);

      const [staff] = await ctx.db
        .select()
        .from(staffMembers)
        .where(eq(staffMembers.id, input.staffMemberId));

      const shifts = await ctx.db
        .select()
        .from(scheduledShifts)
        .where(
          and(
            eq(scheduledShifts.staffMemberId, input.staffMemberId),
            gte(scheduledShifts.workDate, dates[0]),
            lte(scheduledShifts.workDate, dates[6]),
          ),
        )
        .orderBy(asc(scheduledShifts.workDate), asc(scheduledShifts.startTime));

      return {
        weekStart: formatIsoDate(monday),
        dates,
        staff,
        shifts,
      };
    }),
});