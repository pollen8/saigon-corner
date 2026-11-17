ALTER TABLE "scheduled_shifts" ADD COLUMN "department" "staff_department";
--> statement-breakpoint
UPDATE "scheduled_shifts" AS s
SET "department" = m."department"
FROM "staff_members" AS m
WHERE m."id" = s."staff_member_id";
--> statement-breakpoint
UPDATE "scheduled_shifts" SET "department" = 'foh' WHERE "department" IS NULL;
--> statement-breakpoint
ALTER TABLE "scheduled_shifts" ALTER COLUMN "department" SET NOT NULL;
