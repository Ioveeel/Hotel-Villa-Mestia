CREATE TYPE "public"."booking_source" AS ENUM('website', 'booking_com', 'phone', 'walk_in');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('food', 'utilities', 'salaries', 'maintenance', 'supplies', 'taxes', 'other');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'dinner');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"guest_id" integer NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"adults" integer NOT NULL,
	"children" integer DEFAULT 0 NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"source" "booking_source" NOT NULL,
	"external_ref" text,
	"breakfast" boolean DEFAULT false NOT NULL,
	"dinner" boolean DEFAULT false NOT NULL,
	"room_price_per_night" integer,
	"breakfast_price" integer DEFAULT 0 NOT NULL,
	"dinner_price" integer DEFAULT 0 NOT NULL,
	"commission_rate_bp" integer DEFAULT 0 NOT NULL,
	"room_total" integer NOT NULL,
	"meals_total" integer DEFAULT 0 NOT NULL,
	"total_price" integer GENERATED ALWAYS AS (room_total + meals_total) STORED,
	"commission_amount" integer DEFAULT 0 NOT NULL,
	"net_total" integer GENERATED ALWAYS AS (room_total + meals_total - commission_amount) STORED,
	"payment_method" "payment_method",
	"paid_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_source_external_ref_unique" UNIQUE("source","external_ref"),
	CONSTRAINT "bookings_dates_check" CHECK ("bookings"."check_out" > "bookings"."check_in"),
	CONSTRAINT "bookings_adults_check" CHECK ("bookings"."adults" >= 1),
	CONSTRAINT "bookings_children_check" CHECK ("bookings"."children" >= 0),
	CONSTRAINT "bookings_amounts_check" CHECK ("bookings"."room_total" >= 0 AND "bookings"."meals_total" >= 0 AND "bookings"."commission_amount" >= 0
        AND "bookings"."breakfast_price" >= 0 AND "bookings"."dinner_price" >= 0
        AND ("bookings"."room_price_per_night" IS NULL OR "bookings"."room_price_per_night" >= 0)),
	CONSTRAINT "bookings_commission_rate_bp_check" CHECK ("bookings"."commission_rate_bp" >= 0 AND "bookings"."commission_rate_bp" <= 10000),
	CONSTRAINT "bookings_commission_le_room_total_check" CHECK ("bookings"."commission_amount" <= "bookings"."room_total"),
	CONSTRAINT "bookings_source_rules_check" CHECK (("bookings"."source" = 'booking_com' AND "bookings"."breakfast" = true AND "bookings"."breakfast_price" = 0)
        OR ("bookings"."source" <> 'booking_com' AND "bookings"."commission_rate_bp" = 0
            AND "bookings"."commission_amount" = 0 AND "bookings"."room_price_per_night" IS NOT NULL)),
	CONSTRAINT "bookings_payment_check" CHECK (("bookings"."payment_method" IS NULL) = ("bookings"."paid_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "commission_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" "booking_source" NOT NULL,
	"rate_bp" integer NOT NULL,
	"valid_from" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_rates_source_valid_from_unique" UNIQUE("source","valid_from"),
	CONSTRAINT "commission_rates_rate_bp_check" CHECK ("commission_rates"."rate_bp" >= 0 AND "commission_rates"."rate_bp" <= 10000)
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"category" "expense_category" NOT NULL,
	"amount" integer NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount_check" CHECK ("expenses"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"country" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "meal_type" NOT NULL,
	"price" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meal_options_type_unique" UNIQUE("type"),
	CONSTRAINT "meal_options_price_check" CHECK ("meal_options"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "room_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"beds" text NOT NULL,
	"max_guests" integer NOT NULL,
	"base_price" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_types_name_unique" UNIQUE("name"),
	CONSTRAINT "room_types_slug_unique" UNIQUE("slug"),
	CONSTRAINT "room_types_max_guests_check" CHECK ("room_types"."max_guests" > 0),
	CONSTRAINT "room_types_base_price_check" CHECK ("room_types"."base_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"room_type_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_number_unique" UNIQUE("number"),
	CONSTRAINT "rooms_number_check" CHECK ("rooms"."number" > 0)
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_room_dates_idx" ON "bookings" USING btree ("room_id","check_in","check_out");--> statement-breakpoint
CREATE INDEX "bookings_dates_idx" ON "bookings" USING btree ("check_in","check_out");--> statement-breakpoint
CREATE INDEX "bookings_guest_id_idx" ON "bookings" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("date");