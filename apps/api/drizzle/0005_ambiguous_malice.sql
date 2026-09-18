CREATE TABLE "opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"customer_id" text NOT NULL,
	"segment" text NOT NULL,
	"product" text NOT NULL,
	"need" text NOT NULL,
	"value" bigint NOT NULL,
	"stage" text DEFAULT 'prospecting' NOT NULL,
	"confirmed_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_hypothesis" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"missing_info" text[] DEFAULT '{}' NOT NULL,
	"blocker_code" text,
	"blocker_note" text,
	"next_action" text,
	"next_action_owner_id" text,
	"owner_id" text NOT NULL,
	"due_date" date,
	"win_probability" integer DEFAULT 10 NOT NULL,
	"support_needed" text,
	"bm_decision" text,
	"approval_status" text DEFAULT 'sale_reviewing' NOT NULL,
	"outcome" text DEFAULT 'open' NOT NULL,
	"outcome_reason" text,
	"created_via" text DEFAULT 'manual' NOT NULL,
	"drafted_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"lead_acted_at" timestamp with time zone,
	"bm_acted_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunities_code_unique" UNIQUE("code"),
	CONSTRAINT "opportunities_segment" CHECK ("opportunities"."segment" in ('sse', 'rb')),
	CONSTRAINT "opportunities_value" CHECK ("opportunities"."value" > 0),
	CONSTRAINT "opportunities_win_probability" CHECK ("opportunities"."win_probability" between 0 and 100),
	CONSTRAINT "opportunities_stage" CHECK ("opportunities"."stage" in ('prospecting', 'discovery', 'proposal', 'negotiation', 'documentation', 'closing')),
	CONSTRAINT "opportunities_approval_status" CHECK ("opportunities"."approval_status" in ('ai_drafted', 'sale_reviewing', 'sale_confirmed', 'lead_viewed', 'lead_returned', 'lead_approved', 'escalated_to_bm', 'bm_decided', 'completed', 'closed_lost')),
	CONSTRAINT "opportunities_outcome" CHECK ("opportunities"."outcome" in ('open', 'won', 'lost')),
	CONSTRAINT "opportunities_created_via" CHECK ("opportunities"."created_via" in ('manual', 'ai')),
	CONSTRAINT "opportunities_blocker_code" CHECK ("opportunities"."blocker_code" is null or "opportunities"."blocker_code" in ('rate', 'speed', 'experience', 'documents', 'collateral', 'policy', 'competitor', 'customer_hesitation', 'other')),
	CONSTRAINT "opportunities_outcome_reason" CHECK ("opportunities"."outcome" = 'open' or "opportunities"."outcome_reason" is not null)
);
--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_next_action_owner_id_users_id_fk" FOREIGN KEY ("next_action_owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "opportunities_customer" ON "opportunities" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "opportunities_owner_status" ON "opportunities" USING btree ("owner_id","approval_status");--> statement-breakpoint
CREATE INDEX "opportunities_segment_stage" ON "opportunities" USING btree ("segment","stage");--> statement-breakpoint
CREATE INDEX "opportunities_due" ON "opportunities" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "opportunities_next_action" ON "opportunities" USING btree ("next_action_owner_id","due_date");--> statement-breakpoint
CREATE INDEX "opportunities_blocker" ON "opportunities" USING btree ("blocker_code");