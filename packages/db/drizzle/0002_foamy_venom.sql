CREATE TABLE "roster_template_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"staff_member_id" uuid NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"department" "staff_department" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roster_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"source_week_start" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "roster_template_shifts" ADD CONSTRAINT "roster_template_shifts_template_id_roster_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."roster_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_template_shifts" ADD CONSTRAINT "roster_template_shifts_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "roster_template_shifts_template_idx" ON "roster_template_shifts" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "roster_template_shifts_template_day_idx" ON "roster_template_shifts" USING btree ("template_id","day_of_week");