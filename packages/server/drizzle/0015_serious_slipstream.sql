CREATE TYPE "public"."CustomerInterviewGating" AS ENUM('PUBLIC', 'PASSWORD', 'NDA');--> statement-breakpoint
CREATE TYPE "public"."CustomerInterviewStatus" AS ENUM('DRAFT', 'PUBLISHED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."QuestionType" AS ENUM('FREE_TEXT', 'SCALE', 'MULTIPLE_CHOICE', 'YES_NO');--> statement-breakpoint
ALTER TYPE "public"."ReportType" ADD VALUE 'CUSTOMER_DISCOVERY';--> statement-breakpoint
CREATE TABLE "CustomerInterview" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"userId" text NOT NULL,
	"uuid" text NOT NULL,
	"title" text NOT NULL,
	"questions" jsonb NOT NULL,
	"gating" "CustomerInterviewGating" DEFAULT 'PUBLIC' NOT NULL,
	"password" text,
	"status" "CustomerInterviewStatus" DEFAULT 'DRAFT' NOT NULL,
	"waitlistEnabled" boolean DEFAULT true NOT NULL,
	"newsletterEnabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	CONSTRAINT "CustomerInterview_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "InterviewResponse" (
	"id" text PRIMARY KEY NOT NULL,
	"customerInterviewId" text NOT NULL,
	"sessionToken" text NOT NULL,
	"answers" jsonb NOT NULL,
	"respondentName" text,
	"respondentEmail" text,
	"joinedWaitlist" boolean DEFAULT false NOT NULL,
	"joinedNewsletter" boolean DEFAULT false NOT NULL,
	"completedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "InterviewResponse_customerInterviewId_sessionToken_key" UNIQUE("customerInterviewId","sessionToken")
);
--> statement-breakpoint
CREATE TABLE "NdaSignature" (
	"id" text PRIMARY KEY NOT NULL,
	"customerInterviewId" text NOT NULL,
	"interviewResponseId" text,
	"fullName" text NOT NULL,
	"email" text NOT NULL,
	"signature" text NOT NULL,
	"ipAddress" text NOT NULL,
	"signedAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CustomerInterview" ADD CONSTRAINT "CustomerInterview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CustomerInterview" ADD CONSTRAINT "CustomerInterview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InterviewResponse" ADD CONSTRAINT "InterviewResponse_customerInterviewId_fkey" FOREIGN KEY ("customerInterviewId") REFERENCES "public"."CustomerInterview"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "NdaSignature" ADD CONSTRAINT "NdaSignature_customerInterviewId_fkey" FOREIGN KEY ("customerInterviewId") REFERENCES "public"."CustomerInterview"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "NdaSignature" ADD CONSTRAINT "NdaSignature_interviewResponseId_fkey" FOREIGN KEY ("interviewResponseId") REFERENCES "public"."InterviewResponse"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "CustomerInterview_projectId_idx" ON "CustomerInterview" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "CustomerInterview_userId_idx" ON "CustomerInterview" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "CustomerInterview_uuid_key" ON "CustomerInterview" USING btree ("uuid");--> statement-breakpoint
CREATE INDEX "InterviewResponse_customerInterviewId_idx" ON "InterviewResponse" USING btree ("customerInterviewId");--> statement-breakpoint
CREATE INDEX "NdaSignature_customerInterviewId_idx" ON "NdaSignature" USING btree ("customerInterviewId");