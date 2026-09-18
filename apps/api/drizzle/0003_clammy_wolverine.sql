CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"segment" text NOT NULL,
	"owner_id" text NOT NULL,
	"current_products" text[] DEFAULT '{}' NOT NULL,
	"revenue" bigint,
	"relation_stage" text,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"contact_name" text,
	"contact_phone" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_code_unique" UNIQUE("code"),
	CONSTRAINT "customers_segment" CHECK ("customers"."segment" in ('sse', 'rb')),
	CONSTRAINT "customers_revenue" CHECK ("customers"."revenue" is null or "customers"."revenue" >= 0)
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_owner" ON "customers" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "customers_segment" ON "customers" USING btree ("segment");