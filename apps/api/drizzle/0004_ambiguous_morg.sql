CREATE TABLE "signals" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"source" text DEFAULT 'sale' NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"author_id" text,
	"raw_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signals_type" CHECK ("signals"."type" in ('cash_flow', 'product_gap', 'need', 'competition', 'deadline', 'documents', 'other')),
	CONSTRAINT "signals_source" CHECK ("signals"."source" in ('sale', 'system', 'ai')),
	CONSTRAINT "signals_author_by_source" CHECK ("signals"."source" <> 'sale' or "signals"."author_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "signals_customer_observed" ON "signals" USING btree ("customer_id","observed_at");