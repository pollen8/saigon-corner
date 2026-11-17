CREATE TABLE "schedule_coverage_gaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"department" "staff_department" NOT NULL,
	"absent_staff_member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schedule_coverage_gaps" ADD CONSTRAINT "schedule_coverage_gaps_absent_staff_member_id_staff_members_id_fk" FOREIGN KEY ("absent_staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "schedule_coverage_gaps_date_idx" ON "schedule_coverage_gaps" USING btree ("work_date");