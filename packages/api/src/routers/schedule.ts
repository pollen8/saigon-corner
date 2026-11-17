import {
  and,
  asc,
  eq,
  gte,
  lte,
  operatingHoursPeriods,
  scheduledShifts,
  staffHolidays,
  staffMembers,
} from "@app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  clearOverlappingCoverageGaps,
  listCoverageGapsForWeek,
} from "../lib/coverage-gaps.js";
import {
  dayOfWeekFromIso,
  formatIsoDate,
  parseIsoDate,
  startOfWeekMonday,
  weekDatesFromMonday,
} from "../lib/dates.js";
import { adminProcedure, router } from "../trpc.js";
import {
  assertNoOverlappingShift,
  assertShiftAllowed,
  assertStaffNotOnHoliday,
} from "./schedule-assertions.js";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);
const departmentSchema = z.enum(["foh", "kitchen"]);

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

      const [staff, shifts, hours, holidays, coverageGaps] = await Promise.all([
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
        ctx.db
          .select({
            staffMemberId: staffHolidays.staffMemberId,
            workDate: staffHolidays.workDate,
          })
          .from(staffHolidays)
          .where(
            and(
              gte(staffHolidays.workDate, rangeStart),
              lte(staffHolidays.workDate, rangeEnd),
            ),
          ),
        listCoverageGapsForWeek(ctx.db, rangeStart, rangeEnd),
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
        holidays: holidays.map((row) => ({
          staffMemberId: row.staffMemberId,
          workDate: String(row.workDate),
        })),
        coverageGaps,
      };
    }),

  assignShift: adminProcedure
    .input(
      z.object({
        staffMemberId: z.string().uuid(),
        workDate: isoDateSchema,
        startTime: timeSchema,
        endTime: timeSchema,
        department: departmentSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertStaffNotOnHoliday(
        ctx.db,
        input.staffMemberId,
        input.workDate,
      );
      await assertShiftAllowed(
        ctx.db,
        input.workDate,
        input.startTime,
        input.endTime,
      );
      await assertNoOverlappingShift(
        ctx.db,
        input.staffMemberId,
        input.workDate,
        input.startTime,
        input.endTime,
      );

      const [staff] = await ctx.db
        .select({ department: staffMembers.department })
        .from(staffMembers)
        .where(eq(staffMembers.id, input.staffMemberId));

      if (!staff) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Staff not found." });
      }

      const department = input.department ?? staff.department;

      const [row] = await ctx.db
        .insert(scheduledShifts)
        .values({
          staffMemberId: input.staffMemberId,
          workDate: input.workDate,
          startTime: input.startTime,
          endTime: input.endTime,
          department,
        })
        .returning();

      await clearOverlappingCoverageGaps(
        ctx.db,
        input.workDate,
        input.startTime,
        input.endTime,
        department,
      );

      return row;
    }),

  updateShift: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        workDate: isoDateSchema.optional(),
        startTime: timeSchema.optional(),
        endTime: timeSchema.optional(),
        department: departmentSchema.optional(),
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

      const workDate = input.workDate ?? String(existing.workDate);
      const startTime = input.startTime ?? existing.startTime;
      const endTime = input.endTime ?? existing.endTime;
      await assertStaffNotOnHoliday(
        ctx.db,
        existing.staffMemberId,
        workDate,
      );
      await assertShiftAllowed(ctx.db, workDate, startTime, endTime);
      await assertNoOverlappingShift(
        ctx.db,
        existing.staffMemberId,
        workDate,
        startTime,
        endTime,
        existing.id,
      );

      const { id, ...patch } = input;
      const [row] = await ctx.db
        .update(scheduledShifts)
        .set({ ...patch, workDate })
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