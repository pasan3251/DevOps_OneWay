CREATE TYPE "public"."body_type" AS ENUM('truck', 'van');--> statement-breakpoint
CREATE TYPE "public"."brand_type" AS ENUM('Fresh', 'Style', 'Tech');--> statement-breakpoint
CREATE TYPE "public"."discrepancy_status" AS ENUM('LOGGED', 'INVESTIGATING', 'DEFICIT_ORDER_CREATED', 'CREDITED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."discrepancy_type" AS ENUM('FAIL_A_LOADING_SHORTFALL', 'DAMAGE_IN_TRANSIT', 'REJECTED_TEMPERATURE', 'STORE_SHORTFALL');--> statement-breakpoint
CREATE TYPE "public"."driver_status" AS ENUM('available', 'on_trip', 'off_duty');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('QUEUED_NEXT_RUN', 'ORDER_RECORDED', 'DISPATCH_PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'DEFICIT_PENDING', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."refrigeration_type" AS ENUM('reefer', 'ambient');--> statement-breakpoint
CREATE TYPE "public"."temp_requirement" AS ENUM('ambient', 'chilled');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('PLANNED', 'LOCKED', 'LOADING', 'MANIFEST_ISSUED', 'EN_ROUTE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."trip_stop_status" AS ENUM('PENDING', 'ARRIVED', 'UNLOADING', 'DELIVERED', 'DISCREPANCY_FLAGGED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'dispatcher', 'store_manager', 'loader', 'driver');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('available', 'in_transit', 'maintenance', 'offline');--> statement-breakpoint
CREATE TYPE "public"."vehicle_type" AS ENUM('truck_reefer', 'truck_ambient', 'van_reefer', 'van_ambient');--> statement-breakpoint
CREATE TABLE "depots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(128) NOT NULL,
	"province" varchar(64) NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"operating_hours_open" varchar(5) DEFAULT '06:00' NOT NULL,
	"operating_hours_close" varchar(5) DEFAULT '22:00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "depots_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "outlets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(128) NOT NULL,
	"brand" "brand_type" NOT NULL,
	"district" varchar(64) NOT NULL,
	"depot_id" uuid NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"address" text NOT NULL,
	"contact_phone" varchar(32) NOT NULL,
	"window_start" varchar(5) DEFAULT '08:00' NOT NULL,
	"window_end" varchar(5) DEFAULT '18:00' NOT NULL,
	"is_van_only" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outlets_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(64) NOT NULL,
	"last_name" varchar(64) NOT NULL,
	"role" "user_role" NOT NULL,
	"outlet_id" uuid,
	"depot_id" uuid,
	"phone" varchar(32),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_number" varchar(32) NOT NULL,
	"depot_id" uuid NOT NULL,
	"vehicle_type" "vehicle_type" NOT NULL,
	"body_type" "body_type" NOT NULL,
	"refrigeration_type" "refrigeration_type" NOT NULL,
	"max_weight_kg" numeric(10, 2) NOT NULL,
	"max_volume_m3" numeric(10, 2) NOT NULL,
	"status" "vehicle_status" DEFAULT 'available' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_registration_number_unique" UNIQUE("registration_number")
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"depot_id" uuid NOT NULL,
	"license_number" varchar(64) NOT NULL,
	"license_class" varchar(16) DEFAULT 'heavy' NOT NULL,
	"phone" varchar(32) NOT NULL,
	"status" "driver_status" DEFAULT 'available' NOT NULL,
	"current_latitude" numeric(10, 7),
	"current_longitude" numeric(10, 7),
	"last_telematics_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drivers_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "drivers_license_number_unique" UNIQUE("license_number")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"brand" "brand_type" NOT NULL,
	"category" varchar(64) NOT NULL,
	"temp_requirement" "temp_requirement" DEFAULT 'ambient' NOT NULL,
	"unit_weight_kg" numeric(8, 3) NOT NULL,
	"unit_volume_m3" numeric(8, 4) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_requested" integer NOT NULL,
	"quantity_loaded" integer DEFAULT 0 NOT NULL,
	"quantity_delivered" integer DEFAULT 0 NOT NULL,
	"unit_weight_kg" numeric(8, 3) NOT NULL,
	"unit_volume_m3" numeric(8, 4) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" varchar(64) NOT NULL,
	"outlet_id" uuid NOT NULL,
	"brand" "brand_type" NOT NULL,
	"temp_requirement" "temp_requirement" DEFAULT 'ambient' NOT NULL,
	"order_date" date NOT NULL,
	"submission_time" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "order_status" DEFAULT 'ORDER_RECORDED' NOT NULL,
	"total_weight_kg" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_volume_m3" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_items_count" integer DEFAULT 0 NOT NULL,
	"is_cutoff_locked" boolean DEFAULT false NOT NULL,
	"deferred_count" integer DEFAULT 0 NOT NULL,
	"last_deferred_date" date,
	"deferral_reason" varchar(255),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "trip_stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"stop_sequence" integer NOT NULL,
	"loading_sequence" integer NOT NULL,
	"planned_arrival_time" timestamp with time zone,
	"actual_arrival_time" timestamp with time zone,
	"actual_departure_time" timestamp with time zone,
	"wait_time_minutes" integer DEFAULT 0 NOT NULL,
	"status" "trip_stop_status" DEFAULT 'PENDING' NOT NULL,
	"failure_reason" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_stops_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_number" varchar(64) NOT NULL,
	"depot_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"brand" "brand_type" NOT NULL,
	"district" varchar(64) NOT NULL,
	"operating_date" date NOT NULL,
	"trip_sequence_in_day" integer DEFAULT 1 NOT NULL,
	"status" "trip_status" DEFAULT 'PLANNED' NOT NULL,
	"total_weight_kg" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_volume_m3" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"planned_duration_min" integer DEFAULT 0 NOT NULL,
	"actual_departure_time" timestamp with time zone,
	"actual_return_time" timestamp with time zone,
	"gate_pass_token" varchar(128),
	"gate_cleared_by" uuid,
	"gate_cleared_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trips_trip_number_unique" UNIQUE("trip_number")
);
--> statement-breakpoint
CREATE TABLE "proof_of_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_stop_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"store_rep_name" varchar(128) NOT NULL,
	"store_rep_signature_url" text NOT NULL,
	"photo_evidence_url" text,
	"driver_notes" text,
	"geo_latitude" numeric(10, 7) NOT NULL,
	"geo_longitude" numeric(10, 7) NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proof_of_deliveries_trip_stop_id_unique" UNIQUE("trip_stop_id")
);
--> statement-breakpoint
CREATE TABLE "discrepancy_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_number" varchar(64) NOT NULL,
	"order_id" uuid NOT NULL,
	"trip_stop_id" uuid,
	"outlet_id" uuid NOT NULL,
	"reported_by_role" varchar(32) NOT NULL,
	"reported_by_user_id" uuid,
	"status" "discrepancy_status" DEFAULT 'LOGGED' NOT NULL,
	"discrepancy_type" "discrepancy_type" NOT NULL,
	"shortfall_qty" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discrepancy_claims_claim_number_unique" UNIQUE("claim_number")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_role" varchar(32),
	"action" varchar(64) NOT NULL,
	"entity" varchar(64) NOT NULL,
	"entity_id" uuid NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"correlation_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distance_duration_matrix" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"origin_type" varchar(16) NOT NULL,
	"origin_id" uuid NOT NULL,
	"destination_type" varchar(16) NOT NULL,
	"destination_id" uuid NOT NULL,
	"distance_km" numeric(8, 2) NOT NULL,
	"duration_min" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_mutations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_mutation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"entity" varchar(64) NOT NULL,
	"action" varchar(64) NOT NULL,
	"payload_hash" varchar(64) NOT NULL,
	"response_body" jsonb,
	"status" varchar(32) DEFAULT 'COMMITTED' NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_mutations_client_mutation_id_unique" UNIQUE("client_mutation_id")
);
--> statement-breakpoint
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_depot_id_depots_id_fk" FOREIGN KEY ("depot_id") REFERENCES "public"."depots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_depot_id_depots_id_fk" FOREIGN KEY ("depot_id") REFERENCES "public"."depots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_depot_id_depots_id_fk" FOREIGN KEY ("depot_id") REFERENCES "public"."depots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_depot_id_depots_id_fk" FOREIGN KEY ("depot_id") REFERENCES "public"."depots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_depot_id_depots_id_fk" FOREIGN KEY ("depot_id") REFERENCES "public"."depots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_gate_cleared_by_users_id_fk" FOREIGN KEY ("gate_cleared_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_of_deliveries" ADD CONSTRAINT "proof_of_deliveries_trip_stop_id_trip_stops_id_fk" FOREIGN KEY ("trip_stop_id") REFERENCES "public"."trip_stops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_of_deliveries" ADD CONSTRAINT "proof_of_deliveries_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discrepancy_claims" ADD CONSTRAINT "discrepancy_claims_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discrepancy_claims" ADD CONSTRAINT "discrepancy_claims_trip_stop_id_trip_stops_id_fk" FOREIGN KEY ("trip_stop_id") REFERENCES "public"."trip_stops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discrepancy_claims" ADD CONSTRAINT "discrepancy_claims_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discrepancy_claims" ADD CONSTRAINT "discrepancy_claims_reported_by_user_id_users_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_mutations" ADD CONSTRAINT "client_mutations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_outlets_brand_district" ON "outlets" USING btree ("brand","district");--> statement-breakpoint
CREATE INDEX "idx_outlets_depot" ON "outlets" USING btree ("depot_id");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_outlet" ON "users" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "idx_users_depot" ON "users" USING btree ("depot_id");--> statement-breakpoint
CREATE INDEX "idx_vehicles_depot_status" ON "vehicles" USING btree ("depot_id","status");--> statement-breakpoint
CREATE INDEX "idx_vehicles_capabilities" ON "vehicles" USING btree ("body_type","refrigeration_type");--> statement-breakpoint
CREATE INDEX "idx_drivers_depot_status" ON "drivers" USING btree ("depot_id","status");--> statement-breakpoint
CREATE INDEX "idx_drivers_user" ON "drivers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_products_brand_temp" ON "products" USING btree ("brand","temp_requirement");--> statement-breakpoint
CREATE INDEX "idx_order_items_order" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_product" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_outlet_date_temp" ON "orders" USING btree ("outlet_id","order_date","temp_requirement");--> statement-breakpoint
CREATE INDEX "idx_orders_status_date" ON "orders" USING btree ("status","order_date");--> statement-breakpoint
CREATE INDEX "idx_orders_outlet_date" ON "orders" USING btree ("outlet_id","order_date");--> statement-breakpoint
CREATE INDEX "idx_orders_brand_status" ON "orders" USING btree ("brand","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_trip_stop_seq" ON "trip_stops" USING btree ("trip_id","stop_sequence");--> statement-breakpoint
CREATE INDEX "idx_trip_stops_trip_loading" ON "trip_stops" USING btree ("trip_id","loading_sequence");--> statement-breakpoint
CREATE INDEX "idx_trip_stops_outlet_status" ON "trip_stops" USING btree ("outlet_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_vehicle_date_seq" ON "trips" USING btree ("vehicle_id","operating_date","trip_sequence_in_day");--> statement-breakpoint
CREATE INDEX "idx_trips_driver_date" ON "trips" USING btree ("driver_id","operating_date");--> statement-breakpoint
CREATE INDEX "idx_trips_date_status" ON "trips" USING btree ("operating_date","status");--> statement-breakpoint
CREATE INDEX "idx_trips_depot_date" ON "trips" USING btree ("depot_id","operating_date");--> statement-breakpoint
CREATE INDEX "idx_pod_order" ON "proof_of_deliveries" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_discrepancy_order" ON "discrepancy_claims" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_discrepancy_status" ON "discrepancy_claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_discrepancy_outlet" ON "discrepancy_claims" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_actor" ON "audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_matrix_origin_dest" ON "distance_duration_matrix" USING btree ("origin_id","destination_id");