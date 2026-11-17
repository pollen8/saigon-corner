import {
  and,
  asc,
  eq,
  gte,
  inArray,
  lte,
  scheduledShifts,
  staffHolidays,
  staffMembers,
  type Database,
} from "@app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eachIsoDateInRange, parseIsoDate } from "../lib/dates.js";
import { adminProcedure, router } from "../trpc.js";

const departmentSchema = z.enum(["foh", "kitchen"]);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const holidayRangeInputSchema = z
  .object({
    staffMemberId: z.string().uuid(),
    startDate: isoDateSchema,
    endDate: isoDateSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const end = value.endDate ?? value.startDate;
    if (parseIsoDate(end) < parseIsoDate(value.startDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after the start date.",
        path: ["endDate"],
      });
    }
  });

function holidayRangeEnd(input: z.infer<typeof holidayRangeInputSchema>): string {
  return input.endDate ?? input.startDate;
}

async function listHolidayScheduleConflicts(
  db: Database,
  staffMemberId: string,
  startDate: string,
  endDate: string,
) {
  return db
    .select({
      id: scheduledShifts.id,
      workDate: scheduledShifts.workDate,
      startTime: scheduledShifts.startTime,
      endTime: scheduledShifts.endTime,
      department: scheduledShifts.department,
    })
    .from(scheduledShifts)
    .where(
      and(
        eq(scheduledShifts.staffMemberId, staffMemberId),
        gte(scheduledShifts.workDate, startDate),
        lte(scheduledShifts.workDate, endDate),
      ),
    )
    .orderBy(asc(scheduledShifts.workDate), asc(scheduledShifts.startTime));
}

function mapScheduledShiftRow(
  row: Awaited<ReturnType<typeof listHolidayScheduleConflicts>>[number],
) {
  return {
    id: row.id,
    workDate: String(row.workDate),
    startTime: row.startTime,
    endTime: row.endTime,
    department: row.department,
  };
}

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

  listHolidays: adminProcedure
    .input(
      z
        .object({
          staffMemberId: z.string().uuid().optional(),
          fromDate: isoDateSchema.optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input?.staffMemberId) {
        conditions.push(eq(staffHolidays.staffMemberId, input.staffMemberId));
      }
      if (input?.fromDate) {
        conditions.push(gte(staffHolidays.workDate, input.fromDate));
      }

      const rows = await ctx.db
        .select({
          id: staffHolidays.id,
          staffMemberId: staffHolidays.staffMemberId,
          workDate: staffHolidays.workDate,
          staffName: staffMembers.name,
        })
        .from(staffHolidays)
        .innerJoin(
          staffMembers,
          eq(staffHolidays.staffMemberId, staffMembers.id),
        )
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(staffHolidays.workDate), asc(staffMembers.name));

      return rows.map((row) => ({
        id: row.id,
        staffMemberId: row.staffMemberId,
        staffName: row.staffName,
        workDate: String(row.workDate),
      }));
    }),

  holidayScheduleConflicts: adminProcedure
    .input(holidayRangeInputSchema)
    .query(async ({ ctx, input }) => {
      const endDate = holidayRangeEnd(input);
      const conflicts = await listHolidayScheduleConflicts(
        ctx.db,
        input.staffMemberId,
        input.startDate,
        endDate,
      );
      return { shifts: conflicts.map(mapScheduledShiftRow) };
    }),

  addHoliday: adminProcedure
    .input(
      z
        .object({
          staffMemberId: z.string().uuid(),
          startDate: isoDateSchema,
          endDate: isoDateSchema.optional(),
          removeScheduledShifts: z.boolean().optional().default(false),
        })
        .superRefine((value, ctx) => {
          const end = value.endDate ?? value.startDate;
          if (parseIsoDate(end) < parseIsoDate(value.startDate)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "End date must be on or after the start date.",
              path: ["endDate"],
            });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const [staff] = await ctx.db
        .select({ id: staffMembers.id })
        .from(staffMembers)
        .where(eq(staffMembers.id, input.staffMemberId));

      if (!staff) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Staff not found." });
      }

      const endDate = holidayRangeEnd(input);
      const workDates = eachIsoDateInRange(input.startDate, endDate);
      if (workDates.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid date range.",
        });
      }

      const conflicts = await listHolidayScheduleConflicts(
        ctx.db,
        input.staffMemberId,
        input.startDate,
        endDate,
      );

      if (conflicts.length > 0 && !input.removeScheduledShifts) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This person is still scheduled on one or more of these days.",
        });
      }

      let removedShifts = 0;
      if (input.removeScheduledShifts && conflicts.length > 0) {
        const deleted = await ctx.db
          .delete(scheduledShifts)
          .where(
            inArray(
              scheduledShifts.id,
              conflicts.map((row) => row.id),
            ),
          )
          .returning({ id: scheduledShifts.id });
        removedShifts = deleted.length;
      }

      const inserted = await ctx.db
        .insert(staffHolidays)
        .values(
          workDates.map((workDate) => ({
            staffMemberId: input.staffMemberId,
            workDate,
          })),
        )
        .onConflictDoNothing({
          target: [staffHolidays.staffMemberId, staffHolidays.workDate],
        })
        .returning();

      if (inserted.length === 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            workDates.length === 1
              ? "This person is already marked off on that day."
              : "This person is already marked off on every day in that range.",
        });
      }

      return {
        staffMemberId: input.staffMemberId,
        startDate: input.startDate,
        endDate,
        added: inserted.length,
        skipped: workDates.length - inserted.length,
        removedShifts,
      };
    }),

  removeHoliday: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(staffHolidays).where(eq(staffHolidays.id, input.id));
      return { ok: true as const };
    }),

  removeHolidays: adminProcedure
    .input(z.object({ ids: z.array(z.string().uuid()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(staffHolidays)
        .where(inArray(staffHolidays.id, input.ids));
      return { ok: true as const };
    }),
});