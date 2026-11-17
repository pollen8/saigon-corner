import {
  actualTimeLogs,
  and,
  asc,
  eq,
  operatingHoursPeriods,
  scheduledShifts,
  staffHolidays,
  type Database,
} from "@app/db";
import { TRPCError } from "@trpc/server";
import {
  dayOfWeekFromIso,
  minutesToDuration,
  timeRangesOverlap,
} from "../lib/dates.js";
import {
  openingHoursMessage,
  shiftWithinOpeningHours,
} from "../lib/opening-hours.js";

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

export async function assertShiftAllowed(
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

export async function assertNoOverlappingShift(
  db: Database,
  staffMemberId: string,
  workDate: string,
  startTime: string,
  endTime: string,
  ignoreShiftId?: string,
) {
  const existing = await db
    .select({
      id: scheduledShifts.id,
      startTime: scheduledShifts.startTime,
      endTime: scheduledShifts.endTime,
    })
    .from(scheduledShifts)
    .where(
      and(
        eq(scheduledShifts.staffMemberId, staffMemberId),
        eq(scheduledShifts.workDate, workDate),
      ),
    );

  const overlap = existing.find(
    (shift) =>
      shift.id !== ignoreShiftId &&
      timeRangesOverlap(startTime, endTime, shift.startTime, shift.endTime),
  );

  if (overlap) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This block overlaps another shift for this person on the same day.",
    });
  }
}

export async function isStaffOnHoliday(
  db: Database,
  staffMemberId: string,
  workDate: string,
) {
  const [holiday] = await db
    .select({ id: staffHolidays.id })
    .from(staffHolidays)
    .where(
      and(
        eq(staffHolidays.staffMemberId, staffMemberId),
        eq(staffHolidays.workDate, workDate),
      ),
    )
    .limit(1);

  return Boolean(holiday);
}

export async function assertNoOverlappingTimeLog(
  db: Database,
  staffMemberId: string,
  workDate: string,
  startTime: string,
  endTime: string,
  ignoreLogId?: string,
) {
  const existing = await db
    .select({
      id: actualTimeLogs.id,
      startTime: actualTimeLogs.startTime,
      endTime: actualTimeLogs.endTime,
    })
    .from(actualTimeLogs)
    .where(
      and(
        eq(actualTimeLogs.staffMemberId, staffMemberId),
        eq(actualTimeLogs.workDate, workDate),
      ),
    );

  const overlap = existing.find(
    (log) =>
      log.id !== ignoreLogId &&
      timeRangesOverlap(startTime, endTime, log.startTime, log.endTime),
  );

  if (overlap) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "These hours overlap another log entry for this person on the same day.",
    });
  }
}

export async function assertStaffNotOnHoliday(
  db: Database,
  staffMemberId: string,
  workDate: string,
) {
  if (await isStaffOnHoliday(db, staffMemberId, workDate)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This person is marked as off on that day.",
    });
  }
}