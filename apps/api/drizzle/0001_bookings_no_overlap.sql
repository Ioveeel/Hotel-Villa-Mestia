CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist ("room_id" WITH =, daterange("check_in", "check_out", '[)') WITH &&)
  WHERE ("status" <> 'cancelled');
