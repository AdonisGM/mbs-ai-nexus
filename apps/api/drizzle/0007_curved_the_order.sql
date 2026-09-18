CREATE TABLE "targets" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"owner_id" text,
	"unit_id" text NOT NULL,
	"segment" text,
	"period" text NOT NULL,
	"amount" bigint NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "targets_scope" CHECK ("targets"."scope" in ('user', 'unit')),
	CONSTRAINT "targets_amount" CHECK ("targets"."amount" > 0),
	CONSTRAINT "targets_segment" CHECK ("targets"."segment" is null or "targets"."segment" in ('sse', 'rb')),
	CONSTRAINT "targets_owner_by_scope" CHECK (case when "targets"."scope" = 'user' then "targets"."owner_id" is not null else "targets"."owner_id" is null end)
);
--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "targets_period" ON "targets" USING btree ("period");--> statement-breakpoint
CREATE INDEX "targets_owner_period" ON "targets" USING btree ("owner_id","period");--> statement-breakpoint
CREATE UNIQUE INDEX "targets_key" ON "targets" USING btree ("scope",coalesce("owner_id", ''),"unit_id",coalesce("segment", ''),"period");