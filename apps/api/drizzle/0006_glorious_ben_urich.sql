CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"seq" integer NOT NULL,
	"actor_id" text NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"direction" text NOT NULL,
	"to_user_id" text,
	"held_ms" bigint,
	"changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_seq" CHECK ("audit_events"."seq" >= 1),
	CONSTRAINT "audit_events_direction" CHECK ("audit_events"."direction" in ('up', 'down', 'in_place')),
	CONSTRAINT "audit_events_held_ms" CHECK ("audit_events"."held_ms" is null or "audit_events"."held_ms" >= 0),
	CONSTRAINT "audit_events_first_event" CHECK (("audit_events"."from_status" is null) = ("audit_events"."seq" = 1) and ("audit_events"."held_ms" is null) = ("audit_events"."seq" = 1)),
	CONSTRAINT "audit_events_to_user_by_direction" CHECK (case when "audit_events"."direction" = 'in_place' then "audit_events"."to_user_id" is null else "audit_events"."to_user_id" is not null end)
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "audit_events_trace" ON "audit_events" USING btree ("opportunity_id","seq");--> statement-breakpoint
CREATE INDEX "audit_events_transition" ON "audit_events" USING btree ("from_status","to_status");--> statement-breakpoint
CREATE INDEX "audit_events_to_user" ON "audit_events" USING btree ("to_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_created" ON "audit_events" USING btree ("created_at");