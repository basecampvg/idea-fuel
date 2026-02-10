-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."AIClassificationTargetType" AS ENUM('QUERY', 'CLUSTER', 'WINNER_REPORT');--> statement-breakpoint
CREATE TYPE "public"."BlogPostStatus" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."ConfigType" AS ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'SELECT');--> statement-breakpoint
CREATE TYPE "public"."DailyPickStatus" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."DailyRunStatus" AS ENUM('SUCCESS', 'PARTIAL', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."InterviewMode" AS ENUM('SPARK', 'LIGHT', 'IN_DEPTH');--> statement-breakpoint
CREATE TYPE "public"."InterviewStatus" AS ENUM('IN_PROGRESS', 'COMPLETE', 'ABANDONED');--> statement-breakpoint
CREATE TYPE "public"."ProjectStatus" AS ENUM('CAPTURED', 'INTERVIEWING', 'RESEARCHING', 'COMPLETE');--> statement-breakpoint
CREATE TYPE "public"."ReportStatus" AS ENUM('DRAFT', 'GENERATING', 'COMPLETE', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."ReportTier" AS ENUM('BASIC', 'PRO', 'FULL');--> statement-breakpoint
CREATE TYPE "public"."ReportType" AS ENUM('BUSINESS_PLAN', 'POSITIONING', 'COMPETITIVE_ANALYSIS', 'WHY_NOW', 'PROOF_SIGNALS', 'KEYWORDS_SEO', 'CUSTOMER_PROFILE', 'VALUE_EQUATION', 'VALUE_LADDER', 'GO_TO_MARKET');--> statement-breakpoint
CREATE TYPE "public"."ResearchPhase" AS ENUM('QUEUED', 'DEEP_RESEARCH', 'SYNTHESIS', 'SOCIAL_RESEARCH', 'REPORT_GENERATION', 'BUSINESS_PLAN_GENERATION', 'COMPLETE', 'QUERY_GENERATION', 'DATA_COLLECTION');--> statement-breakpoint
CREATE TYPE "public"."ResearchStatus" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETE', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."SparkJobStatus" AS ENUM('QUEUED', 'RUNNING_KEYWORDS', 'RUNNING_RESEARCH', 'RUNNING_PARALLEL', 'SYNTHESIZING', 'ENRICHING', 'COMPLETE', 'PARTIAL_COMPLETE', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."SubscriptionTier" AS ENUM('FREE', 'PRO', 'ENTERPRISE');--> statement-breakpoint
CREATE TYPE "public"."UserRole" AS ENUM('USER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TABLE "AIClassification" (
	"id" text PRIMARY KEY NOT NULL,
	"targetType" "AIClassificationTargetType" NOT NULL,
	"targetId" text NOT NULL,
	"model" text NOT NULL,
	"schemaVersion" text NOT NULL,
	"payloadHash" text NOT NULL,
	"outputJson" jsonb NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AdminIPWhitelist" (
	"id" text PRIMARY KEY NOT NULL,
	"ipAddress" text NOT NULL,
	"label" text,
	"addedBy" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expiresAt" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "EmailCapture" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"source" text DEFAULT 'landing' NOT NULL,
	"beehiivSynced" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Session" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionToken" text NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Project" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"notes" text,
	"status" "ProjectStatus" DEFAULT 'CAPTURED' NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Interview" (
	"id" text PRIMARY KEY NOT NULL,
	"mode" "InterviewMode" DEFAULT 'LIGHT' NOT NULL,
	"status" "InterviewStatus" DEFAULT 'IN_PROGRESS' NOT NULL,
	"currentTurn" integer DEFAULT 0 NOT NULL,
	"maxTurns" integer DEFAULT 5 NOT NULL,
	"messages" jsonb NOT NULL,
	"collectedData" jsonb,
	"confidenceScore" integer DEFAULT 0 NOT NULL,
	"summary" text,
	"lastActiveAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"lastMessageAt" timestamp(3),
	"resumeContext" text,
	"isExpired" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"projectId" text NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "VerificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Research" (
	"id" text PRIMARY KEY NOT NULL,
	"status" "ResearchStatus" DEFAULT 'PENDING' NOT NULL,
	"currentPhase" "ResearchPhase" DEFAULT 'QUEUED' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"estimatedCompletion" timestamp(3),
	"startedAt" timestamp(3),
	"completedAt" timestamp(3),
	"generatedQueries" jsonb,
	"rawData" jsonb,
	"rawDeepResearch" jsonb,
	"researchChunks" jsonb,
	"synthesizedInsights" jsonb,
	"marketAnalysis" jsonb,
	"competitors" jsonb,
	"painPoints" jsonb,
	"positioning" jsonb,
	"whyNow" jsonb,
	"proofSignals" jsonb,
	"keywords" jsonb,
	"opportunityScore" integer,
	"problemScore" integer,
	"feasibilityScore" integer,
	"whyNowScore" integer,
	"scoreJustifications" jsonb,
	"scoreMetadata" jsonb,
	"revenuePotential" jsonb,
	"executionDifficulty" jsonb,
	"gtmClarity" jsonb,
	"founderFit" jsonb,
	"keywordTrends" jsonb,
	"valueLadder" jsonb,
	"actionPrompts" jsonb,
	"userStory" jsonb,
	"socialProof" jsonb,
	"marketSizing" jsonb,
	"techStack" jsonb,
	"businessPlan" text,
	"sparkStatus" "SparkJobStatus",
	"sparkKeywords" jsonb,
	"sparkResult" jsonb,
	"sparkStartedAt" timestamp(3),
	"sparkCompletedAt" timestamp(3),
	"sparkError" text,
	"errorMessage" text,
	"errorPhase" "ResearchPhase",
	"retryCount" integer DEFAULT 0 NOT NULL,
	"notesSnapshot" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"projectId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Report" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "ReportType" NOT NULL,
	"tier" "ReportTier" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"sections" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "ReportStatus" DEFAULT 'DRAFT' NOT NULL,
	"pdfUrl" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"projectId" text NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AdminConfig" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"type" "ConfigType" DEFAULT 'STRING' NOT NULL,
	"category" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"options" jsonb,
	"updatedAt" timestamp(3) NOT NULL,
	"updatedBy" text
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"emailVerified" timestamp(3),
	"name" text,
	"passwordHash" text,
	"image" text,
	"subscription" "SubscriptionTier" DEFAULT 'FREE' NOT NULL,
	"isAdmin" boolean DEFAULT false NOT NULL,
	"role" "UserRole" DEFAULT 'USER' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BlogPost" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"content" jsonb NOT NULL,
	"coverImage" text,
	"status" "BlogPostStatus" DEFAULT 'DRAFT' NOT NULL,
	"publishedAt" timestamp(3),
	"readingTime" text,
	"wordCount" integer DEFAULT 0 NOT NULL,
	"tags" text[],
	"authorId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "DailyRun" (
	"id" text PRIMARY KEY NOT NULL,
	"dateLocal" text NOT NULL,
	"startedAt" timestamp(3) NOT NULL,
	"finishedAt" timestamp(3),
	"status" "DailyRunStatus" NOT NULL,
	"metrics" jsonb,
	"logsRef" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ConfigAuditLog" (
	"id" text PRIMARY KEY NOT NULL,
	"configKey" text NOT NULL,
	"oldValue" jsonb,
	"newValue" jsonb NOT NULL,
	"changedBy" text NOT NULL,
	"changedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "TokenUsage" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"projectId" text,
	"functionName" text NOT NULL,
	"model" text NOT NULL,
	"inputTokens" integer NOT NULL,
	"outputTokens" integer NOT NULL,
	"totalTokens" integer NOT NULL,
	"cachedTokens" integer DEFAULT 0 NOT NULL,
	"costEstimate" double precision,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TrendSeries" (
	"id" text PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"geo" text NOT NULL,
	"timeframe" text NOT NULL,
	"points" jsonb NOT NULL,
	"fetchedAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SerpSnapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"geo" text NOT NULL,
	"device" text DEFAULT 'desktop' NOT NULL,
	"adsCount" integer NOT NULL,
	"shoppingPresent" boolean NOT NULL,
	"topStoriesPresent" boolean NOT NULL,
	"topDomains" jsonb NOT NULL,
	"snippetsSample" jsonb NOT NULL,
	"rawFeatures" jsonb,
	"fetchedAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AuditLog" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Account" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "QueryCandidate" (
	"id" text PRIMARY KEY NOT NULL,
	"runId" text NOT NULL,
	"query" text NOT NULL,
	"normalizedQuery" text NOT NULL,
	"source" text NOT NULL,
	"discoveredAt" timestamp(3) NOT NULL,
	"filterPassed" boolean DEFAULT false NOT NULL,
	"filterPassReason" text,
	"matchedPatterns" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Cluster" (
	"id" text PRIMARY KEY NOT NULL,
	"runId" text NOT NULL,
	"title" text NOT NULL,
	"canonicalQuery" text NOT NULL,
	"memberQueries" jsonb NOT NULL,
	"growthScore" integer NOT NULL,
	"purchaseProofScore" integer NOT NULL,
	"painPointScore" integer NOT NULL,
	"newsSpikeRisk" double precision NOT NULL,
	"combinedScore" double precision NOT NULL,
	"winnerReason" jsonb NOT NULL,
	"triageIntent" text,
	"triageConfidence" double precision,
	"triageCategory" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "DailyPick" (
	"id" text PRIMARY KEY NOT NULL,
	"dateLocal" text NOT NULL,
	"winnerClusterId" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"status" "DailyPickStatus" DEFAULT 'ACTIVE' NOT NULL,
	"publishedAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Research" ADD CONSTRAINT "Research_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Report" ADD CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "QueryCandidate" ADD CONSTRAINT "QueryCandidate_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."DailyRun"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Cluster" ADD CONSTRAINT "Cluster_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."DailyRun"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "DailyPick" ADD CONSTRAINT "DailyPick_winnerClusterId_fkey" FOREIGN KEY ("winnerClusterId") REFERENCES "public"."Cluster"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "AIClassification_payloadHash_idx" ON "AIClassification" USING btree ("payloadHash" text_ops);--> statement-breakpoint
CREATE INDEX "AIClassification_targetType_targetId_idx" ON "AIClassification" USING btree ("targetType" text_ops,"targetId" text_ops);--> statement-breakpoint
CREATE INDEX "AdminIPWhitelist_ipAddress_idx" ON "AdminIPWhitelist" USING btree ("ipAddress" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "AdminIPWhitelist_ipAddress_key" ON "AdminIPWhitelist" USING btree ("ipAddress" text_ops);--> statement-breakpoint
CREATE INDEX "EmailCapture_beehiivSynced_idx" ON "EmailCapture" USING btree ("beehiivSynced" bool_ops);--> statement-breakpoint
CREATE INDEX "EmailCapture_email_idx" ON "EmailCapture" USING btree ("email" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "EmailCapture_email_key" ON "EmailCapture" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "EmailCapture_source_idx" ON "EmailCapture" USING btree ("source" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session" USING btree ("sessionToken" text_ops);--> statement-breakpoint
CREATE INDEX "Project_status_idx" ON "Project" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "Project_userId_idx" ON "Project" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE INDEX "Interview_lastActiveAt_idx" ON "Interview" USING btree ("lastActiveAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "Interview_mode_idx" ON "Interview" USING btree ("mode" enum_ops);--> statement-breakpoint
CREATE INDEX "Interview_projectId_idx" ON "Interview" USING btree ("projectId" text_ops);--> statement-breakpoint
CREATE INDEX "Interview_status_idx" ON "Interview" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "Interview_userId_idx" ON "Interview" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken" USING btree ("identifier" text_ops,"token" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken" USING btree ("token" text_ops);--> statement-breakpoint
CREATE INDEX "Research_currentPhase_idx" ON "Research" USING btree ("currentPhase" enum_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Research_projectId_key" ON "Research" USING btree ("projectId" text_ops);--> statement-breakpoint
CREATE INDEX "Research_status_idx" ON "Research" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "Report_projectId_idx" ON "Report" USING btree ("projectId" text_ops);--> statement-breakpoint
CREATE INDEX "Report_status_idx" ON "Report" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "Report_tier_idx" ON "Report" USING btree ("tier" enum_ops);--> statement-breakpoint
CREATE INDEX "Report_type_idx" ON "Report" USING btree ("type" enum_ops);--> statement-breakpoint
CREATE INDEX "Report_userId_idx" ON "Report" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE INDEX "AdminConfig_category_idx" ON "AdminConfig" USING btree ("category" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "AdminConfig_key_key" ON "AdminConfig" USING btree ("key" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "User_email_key" ON "User" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "BlogPost_authorId_idx" ON "BlogPost" USING btree ("authorId" text_ops);--> statement-breakpoint
CREATE INDEX "BlogPost_publishedAt_idx" ON "BlogPost" USING btree ("publishedAt" timestamp_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE INDEX "BlogPost_status_idx" ON "BlogPost" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "DailyRun_dateLocal_idx" ON "DailyRun" USING btree ("dateLocal" text_ops);--> statement-breakpoint
CREATE INDEX "DailyRun_status_idx" ON "DailyRun" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "ConfigAuditLog_changedAt_idx" ON "ConfigAuditLog" USING btree ("changedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "ConfigAuditLog_configKey_idx" ON "ConfigAuditLog" USING btree ("configKey" text_ops);--> statement-breakpoint
CREATE INDEX "TokenUsage_createdAt_idx" ON "TokenUsage" USING btree ("createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "TokenUsage_functionName_idx" ON "TokenUsage" USING btree ("functionName" text_ops);--> statement-breakpoint
CREATE INDEX "TokenUsage_model_idx" ON "TokenUsage" USING btree ("model" text_ops);--> statement-breakpoint
CREATE INDEX "TokenUsage_userId_idx" ON "TokenUsage" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE INDEX "TrendSeries_fetchedAt_idx" ON "TrendSeries" USING btree ("fetchedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "TrendSeries_query_geo_timeframe_idx" ON "TrendSeries" USING btree ("query" text_ops,"geo" text_ops,"timeframe" text_ops);--> statement-breakpoint
CREATE INDEX "SerpSnapshot_fetchedAt_idx" ON "SerpSnapshot" USING btree ("fetchedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "SerpSnapshot_query_geo_idx" ON "SerpSnapshot" USING btree ("query" text_ops,"geo" text_ops);--> statement-breakpoint
CREATE INDEX "AuditLog_action_idx" ON "AuditLog" USING btree ("action" text_ops);--> statement-breakpoint
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog" USING btree ("createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account" USING btree ("provider" text_ops,"providerAccountId" text_ops);--> statement-breakpoint
CREATE INDEX "QueryCandidate_filterPassed_idx" ON "QueryCandidate" USING btree ("filterPassed" bool_ops);--> statement-breakpoint
CREATE INDEX "QueryCandidate_normalizedQuery_idx" ON "QueryCandidate" USING btree ("normalizedQuery" text_ops);--> statement-breakpoint
CREATE INDEX "QueryCandidate_runId_idx" ON "QueryCandidate" USING btree ("runId" text_ops);--> statement-breakpoint
CREATE INDEX "Cluster_canonicalQuery_idx" ON "Cluster" USING btree ("canonicalQuery" text_ops);--> statement-breakpoint
CREATE INDEX "Cluster_combinedScore_idx" ON "Cluster" USING btree ("combinedScore" float8_ops);--> statement-breakpoint
CREATE INDEX "Cluster_runId_idx" ON "Cluster" USING btree ("runId" text_ops);--> statement-breakpoint
CREATE INDEX "DailyPick_dateLocal_idx" ON "DailyPick" USING btree ("dateLocal" text_ops);--> statement-breakpoint
CREATE INDEX "DailyPick_status_idx" ON "DailyPick" USING btree ("status" enum_ops);
*/