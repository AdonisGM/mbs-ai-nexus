ALTER TABLE "users" DROP CONSTRAINT "users_role";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_segment_by_role";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_manager_by_role";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role" CHECK ("users"."role" in ('sale', 'team_lead', 'bm', 'admin'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_segment_by_role" CHECK ("users"."role" in ('bm', 'admin') or "users"."segment" is not null);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_manager_by_role" CHECK ("users"."role" in ('bm', 'admin') or "users"."manager_id" is not null);