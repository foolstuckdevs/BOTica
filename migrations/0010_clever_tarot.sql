CREATE TABLE "notification_dismissals" (
	"id" serial PRIMARY KEY NOT NULL,
	"notification_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"dismissed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_reads" (
	"id" serial PRIMARY KEY NOT NULL,
	"notification_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"read_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notification_dismissals" ADD CONSTRAINT "notification_dismissals_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_dismissals" ADD CONSTRAINT "notification_dismissals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "nd_notif_user_idx" ON "notification_dismissals" USING btree ("notification_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nr_notif_user_idx" ON "notification_reads" USING btree ("notification_id","user_id");--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "is_read";