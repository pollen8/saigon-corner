import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  time,
  integer,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  users,
  sessions,
  accounts,
  verifications,
  usersRelations,
  sessionsRelations,
  accountsRelations,
} from "./auth-schema";

export {
  users,
  sessions,
  accounts,
  verifications,
  usersRelations,
  sessionsRelations,
  accountsRelations,
};

export const staffDepartmentEnum = pgEnum("staff_department", ["foh", "kitchen"]);

export const staffMembers = pgTable("staff_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  department: staffDepartmentEnum("department").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const staffHolidays = pgTable(
  "staff_holidays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffMemberId: uuid("staff_member_id")
      .notNull()
      .references(() => staffMembers.id, { onDelete: "cascade" }),
    workDate: date("work_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("staff_holidays_staff_date_idx").on(
      table.staffMemberId,
      table.workDate,
    ),
    index("staff_holidays_date_idx").on(table.workDate),
  ],
);

export const operatingHoursPeriods = pgTable(
  "operating_hours_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** 0 = Monday … 6 = Sunday */
    dayOfWeek: integer("day_of_week").notNull(),
    openTime: time("open_time").notNull(),
    closeTime: time("close_time").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("operating_hours_day_idx").on(table.dayOfWeek)],
);

export const scheduleCoverageGaps = pgTable(
  "schedule_coverage_gaps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workDate: date("work_date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    department: staffDepartmentEnum("department").notNull(),
    absentStaffMemberId: uuid("absent_staff_member_id")
      .notNull()
      .references(() => staffMembers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("schedule_coverage_gaps_date_idx").on(table.workDate)],
);

export const scheduledShifts = pgTable(
  "scheduled_shifts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffMemberId: uuid("staff_member_id")
      .notNull()
      .references(() => staffMembers.id, { onDelete: "cascade" }),
    workDate: date("work_date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    department: staffDepartmentEnum("department").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("scheduled_shifts_staff_date_idx").on(
      table.staffMemberId,
      table.workDate,
    ),
    index("scheduled_shifts_date_idx").on(table.workDate),
  ],
);

export const rosterTemplates = pgTable("roster_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  /** Monday of the week this pattern was saved from (reference only). */
  sourceWeekStart: date("source_week_start"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const rosterTemplateShifts = pgTable(
  "roster_template_shifts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => rosterTemplates.id, { onDelete: "cascade" }),
    /** 0 = Monday … 6 = Sunday */
    dayOfWeek: integer("day_of_week").notNull(),
    staffMemberId: uuid("staff_member_id")
      .notNull()
      .references(() => staffMembers.id, { onDelete: "cascade" }),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    department: staffDepartmentEnum("department").notNull(),
  },
  (table) => [
    index("roster_template_shifts_template_idx").on(table.templateId),
    index("roster_template_shifts_template_day_idx").on(
      table.templateId,
      table.dayOfWeek,
    ),
  ],
);

export const actualTimeLogs = pgTable(
  "actual_time_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffMemberId: uuid("staff_member_id")
      .notNull()
      .references(() => staffMembers.id, { onDelete: "cascade" }),
    workDate: date("work_date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("actual_time_logs_staff_date_idx").on(
      table.staffMemberId,
      table.workDate,
    ),
  ],
);