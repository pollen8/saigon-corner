CREATE TABLE "staff_holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_member_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_holidays" ADD CONSTRAINT "staff_holidays_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_holidays_staff_date_idx" ON "staff_holidays" USING btree ("staff_member_id","work_date");--> statement-breakpoint
CREATE INDEX "staff_holidays_date_idx" ON "staff_holidays" USING btree ("work_date");