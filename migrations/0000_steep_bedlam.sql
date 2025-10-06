CREATE TABLE "daily_duties" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" varchar NOT NULL,
	"task" text NOT NULL,
	"completed" boolean DEFAULT false,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "daily_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"report_date" text NOT NULL,
	"agent_name" text NOT NULL,
	"shift_time" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "email_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipients" jsonb NOT NULL,
	"daily_send_time" text DEFAULT '06:30',
	"format" text DEFAULT 'both',
	"auto_send" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "guest_checkins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" varchar NOT NULL,
	"guest_name" text NOT NULL,
	"apartment" text NOT NULL,
	"check_in_time" text NOT NULL,
	"notes" text,
	"shift" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "package_audits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" varchar NOT NULL,
	"resident_name" text NOT NULL,
	"room_number" text NOT NULL,
	"storage_location" text NOT NULL,
	"carrier" text,
	"tracking_number" text,
	"package_type" text,
	"received_time" text NOT NULL,
	"notes" text,
	"shift" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "shift_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" varchar NOT NULL,
	"content" text NOT NULL,
	"shift" text NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
