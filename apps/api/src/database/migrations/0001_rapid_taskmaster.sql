CREATE TYPE "public"."delivery_outcome" AS ENUM('FULL', 'PARTIAL');--> statement-breakpoint
ALTER TYPE "public"."trip_status" ADD VALUE 'RETURNING' BEFORE 'COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."trip_stop_status" ADD VALUE 'WAITING_WINDOW' BEFORE 'UNLOADING';--> statement-breakpoint
ALTER TABLE "outlets" ADD COLUMN "mall_window_start" varchar(5);--> statement-breakpoint
ALTER TABLE "outlets" ADD COLUMN "mall_window_end" varchar(5);--> statement-breakpoint
ALTER TABLE "outlets" ADD COLUMN "parking_constraint" varchar(32) DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD COLUMN "window_hold_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD COLUMN "sla_breach" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD COLUMN "sla_breach_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "driver_ready_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "driver_checklist" jsonb;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "return_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "proof_of_deliveries" ADD COLUMN "store_rep_designation" varchar(128);--> statement-breakpoint
ALTER TABLE "proof_of_deliveries" ADD COLUMN "outcome" "delivery_outcome" DEFAULT 'FULL' NOT NULL;--> statement-breakpoint
ALTER TABLE "proof_of_deliveries" ADD COLUMN "expected_cartons" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "proof_of_deliveries" ADD COLUMN "delivered_cartons" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "proof_of_deliveries" ALTER COLUMN "store_rep_signature_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "client_mutations" ADD COLUMN "occurred_at" timestamp with time zone DEFAULT now() NOT NULL;
