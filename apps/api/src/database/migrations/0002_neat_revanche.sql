CREATE TYPE "public"."exception_resolution" AS ENUM('OPEN', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."loading_exception_type" AS ENUM('SHORTFALL', 'DAMAGE', 'TEMPERATURE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."manifest_status" AS ENUM('PENDING', 'VERIFIED', 'EXCEPTION', 'RESOLVED', 'CLEARED', 'STALE');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('TEXT', 'IMAGE', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('ORDER_CREATED', 'PLAN_PUBLISHED', 'PLAN_REVISED', 'LOADING_EXCEPTION', 'LOADING_EXCEPTION_RESOLVED', 'DEPARTURE_CLEARED', 'DRIVER_READY', 'TRIP_DEPARTED', 'LATE_RISK', 'DELIVERY_COMPLETED', 'DELIVERY_EXCEPTION', 'ORDER_DEFERRED', 'RECEIPT_CONFIRMED', 'RECEIVING_DISCREPANCY', 'SYNC_CONFLICT');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('DRAFT', 'VALIDATED', 'PUBLISHED', 'SUPERSEDED');--> statement-breakpoint
CREATE TYPE "public"."receipt_status" AS ENUM('CONFIRMED', 'DISCREPANCY');--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'LOADED' BEFORE 'IN_TRANSIT';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'FAILED' BEFORE 'DEFICIT_PENDING';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'RECEIVED' BEFORE 'DEFICIT_PENDING';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'DISPUTED' BEFORE 'DEFICIT_PENDING';--> statement-breakpoint
ALTER TYPE "public"."trip_status" ADD VALUE 'CLEARED' BEFORE 'EN_ROUTE';--> statement-breakpoint
ALTER TYPE "public"."trip_status" ADD VALUE 'DRIVER_READY' BEFORE 'EN_ROUTE';--> statement-breakpoint
CREATE TABLE "sync_conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_mutation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"entity" varchar(64) NOT NULL,
	"action" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"reason" text NOT NULL,
	"server_state" jsonb,
	"status" varchar(32) DEFAULT 'OPEN' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"depot_id" uuid NOT NULL,
	"operating_date" date NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" "plan_status" DEFAULT 'DRAFT' NOT NULL,
	"revision_reason" text,
	"supersedes_version_id" uuid,
	"created_by" uuid,
	"validated_at" timestamp with time zone,
	"published_by" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loading_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manifest_id" uuid NOT NULL,
	"trip_stop_id" uuid,
	"order_id" uuid NOT NULL,
	"type" "loading_exception_type" NOT NULL,
	"affected_sku" varchar(64),
	"affected_quantity" integer DEFAULT 0 NOT NULL,
	"notes" text NOT NULL,
	"evidence_url" text,
	"status" "exception_resolution" DEFAULT 'OPEN' NOT NULL,
	"reported_by" uuid,
	"resolved_by" uuid,
	"resolution" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loading_manifests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"plan_version_id" uuid NOT NULL,
	"manifest_version" integer DEFAULT 1 NOT NULL,
	"status" "manifest_status" DEFAULT 'PENDING' NOT NULL,
	"expected_weight_kg" numeric(10, 2) NOT NULL,
	"expected_volume_m3" numeric(10, 2) NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"verification_notes" text,
	"stale_at" timestamp with time zone,
	"cleared_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_read_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid,
	"type" "message_type" DEFAULT 'TEXT' NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(160) NOT NULL,
	"message" text NOT NULL,
	"entity_type" varchar(64),
	"entity_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"trip_stop_id" uuid NOT NULL,
	"confirmed_by" uuid,
	"status" "receipt_status" NOT NULL,
	"notes" text,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trip_stops" DROP CONSTRAINT "trip_stops_order_id_unique";--> statement-breakpoint
DROP INDEX "uniq_vehicle_date_seq";--> statement-breakpoint
ALTER TABLE "outlets" ADD COLUMN "dock_type" varchar(32) DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "outlets" ADD COLUMN "service_time_minutes" numeric(6, 2) DEFAULT '20.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "fuel_efficiency_km_per_l" numeric(8, 2) DEFAULT '6.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "weekly_fuel_quota_l" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "week_to_date_fuel_used_l" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deferral_reason_code" varchar(64);--> statement-breakpoint
ALTER TABLE "trip_stops" ADD COLUMN "failure_notes" text;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD COLUMN "failure_photo_url" text;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD COLUMN "affected_cartons" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD COLUMN "reported_delay_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD COLUMN "delay_reason" text;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD COLUMN "last_delay_reported_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "plan_version_id" uuid;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "planned_distance_km" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "planned_fuel_litres" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "planned_departure_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "planned_return_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_plans" ADD CONSTRAINT "delivery_plans_depot_id_depots_id_fk" FOREIGN KEY ("depot_id") REFERENCES "public"."depots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_plans" ADD CONSTRAINT "delivery_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD CONSTRAINT "plan_versions_plan_id_delivery_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."delivery_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD CONSTRAINT "plan_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD CONSTRAINT "plan_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loading_exceptions" ADD CONSTRAINT "loading_exceptions_manifest_id_loading_manifests_id_fk" FOREIGN KEY ("manifest_id") REFERENCES "public"."loading_manifests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loading_exceptions" ADD CONSTRAINT "loading_exceptions_trip_stop_id_trip_stops_id_fk" FOREIGN KEY ("trip_stop_id") REFERENCES "public"."trip_stops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loading_exceptions" ADD CONSTRAINT "loading_exceptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loading_exceptions" ADD CONSTRAINT "loading_exceptions_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loading_exceptions" ADD CONSTRAINT "loading_exceptions_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loading_manifests" ADD CONSTRAINT "loading_manifests_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loading_manifests" ADD CONSTRAINT "loading_manifests_plan_version_id_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."plan_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loading_manifests" ADD CONSTRAINT "loading_manifests_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_read_states" ADD CONSTRAINT "message_read_states_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_read_states" ADD CONSTRAINT "message_read_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_receipts" ADD CONSTRAINT "store_receipts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_receipts" ADD CONSTRAINT "store_receipts_trip_stop_id_trip_stops_id_fk" FOREIGN KEY ("trip_stop_id") REFERENCES "public"."trip_stops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_receipts" ADD CONSTRAINT "store_receipts_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_sync_conflict_mutation_user" ON "sync_conflicts" USING btree ("client_mutation_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_sync_conflicts_user_status" ON "sync_conflicts" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_delivery_plan_depot_date" ON "delivery_plans" USING btree ("depot_id","operating_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_plan_version" ON "plan_versions" USING btree ("plan_id","version_number");--> statement-breakpoint
CREATE INDEX "idx_plan_versions_status" ON "plan_versions" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "idx_loading_exception_manifest_status" ON "loading_exceptions" USING btree ("manifest_id","status");--> statement-breakpoint
CREATE INDEX "idx_loading_exception_order" ON "loading_exceptions" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_manifest_trip_version" ON "loading_manifests" USING btree ("trip_id","manifest_version");--> statement-breakpoint
CREATE INDEX "idx_manifest_plan_status" ON "loading_manifests" USING btree ("plan_version_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_conversation_participant" ON "conversation_participants" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_participants_user" ON "conversation_participants" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_message_reader" ON "message_read_states" USING btree ("message_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_message_read_user" ON "message_read_states" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_date" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_store_receipt_stop" ON "store_receipts" USING btree ("trip_stop_id");--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_plan_version_id_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."plan_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_trip_stops_order" ON "trip_stops" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_vehicle_plan_date_seq" ON "trips" USING btree ("plan_version_id","vehicle_id","operating_date","trip_sequence_in_day");