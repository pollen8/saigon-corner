import {
  and,
  asc,
  eq,
  gte,
  inArray,
  lte,
  scheduleCoverageGaps,
  staffMembers,
  type Database,
} from "@app/db";
import { timeRangesOverlap } from "./dates.js";

export async function clearCoverageGapsForWeek(
  db: Database,
  rangeStart: string,
  rangeEnd: string,
) {
  await db
    .delete(scheduleCoverageGaps)
    .where(
      and(
        gte(scheduleCoverageGaps.workDate, rangeStart),
        lte(scheduleCoverageGaps.workDate, rangeEnd),
      ),
    );
}

export async function clearOverlappingCoverageGaps(
  db: Database,
  workDate: string,
  startTime: string,
  endTime: string,
  department: "foh" | "kitchen",
) {
  const rows = await db
    .select({
      id: scheduleCoverageGaps.id,
      startTime: scheduleCoverageGaps.startTime,
      endTime: scheduleCoverageGaps.endTime,
      department: scheduleCoverageGaps.department,
    })
    .from(scheduleCoverageGaps)
    .where(
      and(
        eq(scheduleCoverageGaps.workDate, workDate),
        eq(scheduleCoverageGaps.department, department),
      ),
    );

  const toRemove = rows.filter((row) =>
    timeRangesOverlap(startTime, endTime, row.startTime, row.endTime),
  );
  if (toRemove.length === 0) return;

  await db
    .delete(scheduleCoverageGaps)
    .where(inArray(scheduleCoverageGaps.id, toRemove.map((row) => row.id)));
}

export async function listCoverageGapsForWeek(
  db: Database,
  rangeStart: string,
  rangeEnd: string,
) {
  const rows = await db
    .select({
      id: scheduleCoverageGaps.id,
      workDate: scheduleCoverageGaps.workDate,
      startTime: scheduleCoverageGaps.startTime,
      endTime: scheduleCoverageGaps.endTime,
      department: scheduleCoverageGaps.department,
      absentStaffMemberId: scheduleCoverageGaps.absentStaffMemberId,
      absentStaffName: staffMembers.name,
    })
    .from(scheduleCoverageGaps)
    .innerJoin(
      staffMembers,
      eq(scheduleCoverageGaps.absentStaffMemberId, staffMembers.id),
    )
    .where(
      and(
        gte(scheduleCoverageGaps.workDate, rangeStart),
        lte(scheduleCoverageGaps.workDate, rangeEnd),
      ),
    )
    .orderBy(
      asc(scheduleCoverageGaps.workDate),
      asc(scheduleCoverageGaps.startTime),
    );

  return rows.map((row) => ({
    id: row.id,
    workDate: String(row.workDate),
    startTime: row.startTime,
    endTime: row.endTime,
    department: row.department,
    absentStaffMemberId: row.absentStaffMemberId,
    absentStaffName: row.absentStaffName,
  }));
}