CREATE TABLE "booths" (
	"id" varchar(8) PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"category" varchar(16) DEFAULT 'robot' NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommend_minutes" integer DEFAULT 20 NOT NULL,
	"image_url" text,
	"video_url" text,
	"owner_name" text,
	"owner_role" text,
	"owner_org" text,
	"owner_contact" text,
	"zone" varchar(16),
	"gx" integer,
	"gy" integer,
	"exhibitor_user_id" varchar(128),
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exhibitor_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"booth_id" varchar(8) NOT NULL,
	"from_user_id" varchar(128) NOT NULL,
	"to_user_id" varchar(128) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expo_booth_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"booth_id" varchar(8) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"email" varchar(256),
	"name" text,
	"avatar_url" text,
	"role" varchar(16) DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "booths_exhibitor_idx" ON "booths" USING btree ("exhibitor_user_id");--> statement-breakpoint
CREATE INDEX "booths_status_idx" ON "booths" USING btree ("status");--> statement-breakpoint
CREATE INDEX "messages_booth_idx" ON "exhibitor_messages" USING btree ("booth_id");--> statement-breakpoint
CREATE INDEX "messages_to_user_idx" ON "exhibitor_messages" USING btree ("to_user_id");--> statement-breakpoint
CREATE INDEX "relations_booth_kind_idx" ON "expo_booth_relations" USING btree ("booth_id","kind");--> statement-breakpoint
CREATE INDEX "relations_user_idx" ON "expo_booth_relations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");