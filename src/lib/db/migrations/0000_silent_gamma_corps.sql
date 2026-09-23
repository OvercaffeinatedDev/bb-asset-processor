CREATE TYPE "public"."submission_status" AS ENUM('under_review', 'posted');--> statement-breakpoint
CREATE TABLE "asset_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deployment_id" varchar(255) NOT NULL,
	"submission_id" varchar(255) NOT NULL,
	"activity_id" varchar(255),
	"resource_link_id" varchar(255) NOT NULL,
	"context_id" varchar(255),
	"context_title" varchar(512),
	"asset_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"title" varchar(512),
	"filename" varchar(512) NOT NULL,
	"stored_filename" varchar(600) NOT NULL,
	"content_type" varchar(255),
	"file_size" integer,
	"checksum" varchar(255),
	"plagiarism_score" integer NOT NULL,
	"status" "submission_status" DEFAULT 'under_review' NOT NULL,
	"report_url" varchar(2048),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_submissions_submission_asset_unique" UNIQUE("submission_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"site" varchar(2048) NOT NULL,
	"token" varchar(2048) NOT NULL,
	"expiration_date" timestamp with time zone NOT NULL,
	CONSTRAINT "auth_tokens_site_unique" UNIQUE("site")
);
--> statement-breakpoint
CREATE TABLE "lti_sessions" (
	"state" uuid PRIMARY KEY NOT NULL,
	"nonce" uuid NOT NULL,
	"deployment_id" varchar(255) NOT NULL,
	"sub" varchar(255),
	"aud" varchar(255),
	"dl_return_url" varchar(2048),
	"dl_data" varchar(255),
	"one_time_session_token" varchar(50),
	"site_url" varchar(2048),
	"jwt_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
