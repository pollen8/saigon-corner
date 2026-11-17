import {
  and,
  asc,
  desc,
  eq,
  gte,
  lte,
  rosterTemplates,
  rosterTemplateShifts,
  scheduleCoverageGaps,
  scheduledShifts,
  staffMembers,
} from "@app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  dayOfWeekFromIso,
  formatIsoDate,
  parseIsoDate,
  startOfWeekMonday,
  weekDatesFromMonday,
} from "../lib/dates.js";
import { clearCoverageGapsForWeek } from "../lib/coverage-gaps.js";
import { adminProcedure, router } from "../trpc.js";
import {
  assertNoOverlappingShift,
  assertShiftAllowed,
  isStaffOnHoliday,
} from "./schedule-assertions.js";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const templatesRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const templates = await ctx.db
      .select()
      .from(rosterTemplates)
      .orderBy(desc(rosterTemplates.updatedAt));

    const shiftRows = await ctx.db
      .select({ templateId: rosterTemplateShifts.templateId })
      .from(rosterTemplateShifts);

    const blockCount = new Map<string, number>();
    for (const row of shiftRows) {
      blockCount.set(row.templateId, (blockCount.get(row.templateId) ?? 0) + 1);
    }

    return templates.map((template) => ({
      id: template.id,
      name: template.name,
      sourceWeekStart: template.sourceWeekStart
        ? String(template.sourceWeekStart)
        : null,
      updatedAt: template.updatedAt,
      blockCount: blockCount.get(template.id) ?? 0,
    }));
  }),

  createFromWeek: adminProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(120),
        weekStart: isoDateSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const monday = startOfWeekMonday(parseIsoDate(input.weekStart));
      const dates = weekDatesFromMonday(monday);
      const shifts = await ctx.db
        .select()
        .from(scheduledShifts)
        .where(
          and(
            gte(scheduledShifts.workDate, dates[0]),
            lte(scheduledShifts.workDate, dates[6]),
          ),
        )
        .orderBy(asc(scheduledShifts.workDate), asc(scheduledShifts.startTime));

      if (shifts.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This week has no shifts to save as a template.",
        });
      }

      const [template] = await ctx.db
        .insert(rosterTemplates)
        .values({
          name: input.name,
          sourceWeekStart: formatIsoDate(monday),
        })
        .returning();

      for (const shift of shifts) {
        await ctx.db.insert(rosterTemplateShifts).values({
          templateId: template.id,
          dayOfWeek: dayOfWeekFromIso(String(shift.workDate)),
          staffMemberId: shift.staffMemberId,
          startTime: shift.startTime,
          endTime: shift.endTime,
          department: shift.department,
        });
      }

      return { id: template.id, name: template.name, blockCount: shifts.length };
    }),

  remove: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(rosterTemplates)
        .where(eq(rosterTemplates.id, input.id));
      return { ok: true as const };
    }),

  applyToWeek: adminProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        targetWeekStart: isoDateSchema,
        replaceExisting: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [template] = await ctx.db
        .select()
        .from(rosterTemplates)
        .where(eq(rosterTemplates.id, input.templateId));

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found.",
        });
      }

      const blocks = await ctx.db
        .select()
        .from(rosterTemplateShifts)
        .where(eq(rosterTemplateShifts.templateId, input.templateId))
        .orderBy(
          asc(rosterTemplateShifts.dayOfWeek),
          asc(rosterTemplateShifts.startTime),
        );

      if (blocks.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This template has no shifts.",
        });
      }

      const monday = startOfWeekMonday(parseIsoDate(input.targetWeekStart));
      const dates = weekDatesFromMonday(monday);

      if (input.replaceExisting) {
        await ctx.db
          .delete(scheduledShifts)
          .where(
            and(
              gte(scheduledShifts.workDate, dates[0]),
              lte(scheduledShifts.workDate, dates[6]),
            ),
          );
        await clearCoverageGapsForWeek(ctx.db, dates[0], dates[6]);
      }

      const staffRows = await ctx.db.select().from(staffMembers);
      const staffById = new Map(staffRows.map((row) => [row.id, row]));

      let applied = 0;
      const skipped: {
        dayOfWeek: number;
        staffName: string;
        reason: string;
        needsCover: boolean;
      }[] = [];
      const coverageGapValues: (typeof scheduleCoverageGaps.$inferInsert)[] = [];

      for (const block of blocks) {
        const workDate = dates[block.dayOfWeek];
        if (!workDate) {
          skipped.push({
            dayOfWeek: block.dayOfWeek,
            staffName: "—",
            reason: "Invalid day in template.",
            needsCover: false,
          });
          continue;
        }

        const staff = staffById.get(block.staffMemberId);
        const staffName = staff?.name ?? "Unknown staff";
        if (!staff?.active) {
          skipped.push({
            dayOfWeek: block.dayOfWeek,
            staffName,
            reason: "Staff member is inactive.",
            needsCover: false,
          });
          continue;
        }

        if (await isStaffOnHoliday(ctx.db, block.staffMemberId, workDate)) {
          skipped.push({
            dayOfWeek: block.dayOfWeek,
            staffName,
            reason: "Marked as off on this day.",
            needsCover: true,
          });
          coverageGapValues.push({
            workDate,
            startTime: block.startTime,
            endTime: block.endTime,
            department: block.department,
            absentStaffMemberId: block.staffMemberId,
          });
          continue;
        }

        try {
          await assertShiftAllowed(
            ctx.db,
            workDate,
            block.startTime,
            block.endTime,
          );
          await assertNoOverlappingShift(
            ctx.db,
            block.staffMemberId,
            workDate,
            block.startTime,
            block.endTime,
          );
          await ctx.db.insert(scheduledShifts).values({
            staffMemberId: block.staffMemberId,
            workDate,
            startTime: block.startTime,
            endTime: block.endTime,
            department: block.department,
          });
          applied += 1;
        } catch (error) {
          const message =
            error instanceof TRPCError
              ? error.message
              : "Could not schedule this block.";
          skipped.push({
            dayOfWeek: block.dayOfWeek,
            staffName,
            reason: message,
            needsCover: false,
          });
        }
      }

      if (coverageGapValues.length > 0) {
        for (const gap of coverageGapValues) {
          await ctx.db
            .delete(scheduleCoverageGaps)
            .where(
              and(
                eq(scheduleCoverageGaps.workDate, gap.workDate),
                eq(
                  scheduleCoverageGaps.absentStaffMemberId,
                  gap.absentStaffMemberId,
                ),
                eq(scheduleCoverageGaps.startTime, gap.startTime),
                eq(scheduleCoverageGaps.endTime, gap.endTime),
              ),
            );
        }
        await ctx.db.insert(scheduleCoverageGaps).values(coverageGapValues);
      }

      return {
        templateName: template.name,
        targetWeekStart: formatIsoDate(monday),
        applied,
        skipped,
        coverageGaps: coverageGapValues.length,
      };
    }),
});