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