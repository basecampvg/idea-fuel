CREATE TYPE "public"."AgentConversationStatus" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."AssumptionCategory" AS ENUM('PRICING', 'ACQUISITION', 'RETENTION', 'MARKET', 'COSTS', 'FUNDING', 'TIMELINE');--> statement-breakpoint
CREATE TYPE "public"."AssumptionConfidence" AS ENUM('USER', 'RESEARCHED', 'AI_ESTIMATE', 'CALCULATED');--> statement-breakpoint
CREATE TYPE "public"."AssumptionTier" AS ENUM('SPARK', 'LIGHT', 'IN_DEPTH');--> statement-breakpoint
CREATE TYPE "public"."AssumptionValueType" AS ENUM('NUMBER', 'PERCENTAGE', 'CURRENCY', 'TEXT', 'DATE', 'SELECT');--> statement-breakpoint
CREATE TYPE "public"."EmbeddingSourceType" AS ENUM('REPORT', 'RESEARCH', 'INTERVIEW', 'NOTES', 'SERPAPI');--> statement-breakpoint
CREATE TYPE "public"."ERPConnectionStatus" AS ENUM('ACTIVE', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."ERPProvider" AS ENUM('QUICKBOOKS', 'XERO');--> statement-breakpoint
CREATE TYPE "public"."FinancialModelStatus" AS ENUM('DRAFT', 'ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."KnowledgeLevel" AS ENUM('BEGINNER', 'STANDARD', 'EXPERT');--> statement-breakpoint
CREATE TYPE "public"."SnapshotAction" AS ENUM('MANUAL', 'AUTO_SAVE');--> statement-breakpoint
CREATE TYPE "public"."TemplateCategory" AS ENUM('TECH', 'SERVICES', 'RETAIL', 'FOOD', 'CONSTRUCTION', 'HEALTHCARE', 'REAL_ESTATE', 'MANUFACTURING', 'NONPROFIT', 'FREELANCER');--> statement-breakpoint
CREATE TABLE "AgentConversation" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"userId" text NOT NULL,
	"status" "AgentConversationStatus" DEFAULT 'ACTIVE' NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text,
	"messageCount" integer DEFAULT 0 NOT NULL,
	"totalTokensUsed" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	CONSTRAINT "AgentConversation_projectId_userId_key" UNIQUE("projectId","userId")
);
--> statement-breakpoint
CREATE TABLE "AgentInsight" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"userId" text NOT NULL,
	"reportId" text,
	"conversationId" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"prompt" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AgentMessage" (
	"id" text PRIMARY KEY NOT NULL,
	"conversationId" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"toolCalls" jsonb,
	"toolResults" jsonb,
	"tokenCount" integer,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AssumptionHistory" (
	"id" text PRIMARY KEY NOT NULL,
	"assumptionId" text NOT NULL,
	"oldValue" text,
	"newValue" text,
	"oldConfidence" "AssumptionConfidence",
	"newConfidence" "AssumptionConfidence",
	"changedByActor" text NOT NULL,
	"changedByUserId" text,
	"reason" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Assumption" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"scenarioId" text,
	"parentId" text,
	"category" "AssumptionCategory" NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"numericValue" numeric(15, 2),
	"timeSeries" jsonb,
	"valueType" "AssumptionValueType" NOT NULL,
	"unit" text,
	"confidence" "AssumptionConfidence" DEFAULT 'AI_ESTIMATE' NOT NULL,
	"source" text DEFAULT 'System default' NOT NULL,
	"sourceUrl" text,
	"formula" text,
	"dependsOn" text[] DEFAULT '{}'::text[] NOT NULL,
	"tier" "AssumptionTier",
	"isSensitive" boolean DEFAULT false NOT NULL,
	"isRequired" boolean DEFAULT true NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"updatedByActor" text DEFAULT 'system' NOT NULL,
	"updatedByUserId" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	CONSTRAINT "Assumption_projectId_key_key" UNIQUE("projectId","key")
);
--> statement-breakpoint
CREATE TABLE "BudgetLineItem" (
	"id" text PRIMARY KEY NOT NULL,
	"modelId" text NOT NULL,
	"erpConnectionId" text,
	"category" text NOT NULL,
	"accountName" text NOT NULL,
	"erpAccountId" text,
	"budgetValues" jsonb,
	"actualValues" jsonb,
	"lastSyncAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Embedding" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"sourceType" "EmbeddingSourceType" NOT NULL,
	"sourceId" text NOT NULL,
	"chunkIndex" integer DEFAULT 0 NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"metadata" jsonb,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "Embedding_source_chunk_key" UNIQUE("sourceType","sourceId","chunkIndex")
);
--> statement-breakpoint
CREATE TABLE "ERPConnection" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"provider" "ERPProvider" NOT NULL,
	"encryptedAccessToken" text NOT NULL,
	"encryptedRefreshToken" text,
	"realmId" text,
	"tenantId" text,
	"companyName" text,
	"status" "ERPConnectionStatus" DEFAULT 'ACTIVE' NOT NULL,
	"tokenExpiresAt" timestamp (3),
	"lastSyncAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "FinancialModel" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"projectId" text,
	"templateId" text,
	"name" text NOT NULL,
	"knowledgeLevel" "KnowledgeLevel" DEFAULT 'BEGINNER' NOT NULL,
	"forecastYears" integer DEFAULT 5 NOT NULL,
	"status" "FinancialModelStatus" DEFAULT 'DRAFT' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "IndustryTemplate" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" "TemplateCategory" NOT NULL,
	"defaultAssumptions" jsonb NOT NULL,
	"lineItems" jsonb NOT NULL,
	"wizardQuestions" jsonb,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ModelSnapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"modelId" text NOT NULL,
	"name" text NOT NULL,
	"assumptionData" jsonb NOT NULL,
	"computedOutputs" jsonb,
	"createdByAction" "SnapshotAction" DEFAULT 'MANUAL' NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Scenario" (
	"id" text PRIMARY KEY NOT NULL,
	"modelId" text NOT NULL,
	"name" text NOT NULL,
	"isBase" boolean DEFAULT false NOT NULL,
	"description" text,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Research" ADD COLUMN "swot" jsonb;--> statement-breakpoint
ALTER TABLE "AgentConversation" ADD CONSTRAINT "AgentConversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AgentConversation" ADD CONSTRAINT "AgentConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AgentInsight" ADD CONSTRAINT "AgentInsight_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AgentInsight" ADD CONSTRAINT "AgentInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AgentInsight" ADD CONSTRAINT "AgentInsight_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."Report"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AgentInsight" ADD CONSTRAINT "AgentInsight_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."AgentConversation"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AgentMessage" ADD CONSTRAINT "AgentMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."AgentConversation"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AssumptionHistory" ADD CONSTRAINT "AssumptionHistory_assumptionId_fkey" FOREIGN KEY ("assumptionId") REFERENCES "public"."Assumption"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Assumption" ADD CONSTRAINT "Assumption_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Assumption" ADD CONSTRAINT "Assumption_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "public"."Scenario"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BudgetLineItem" ADD CONSTRAINT "BudgetLineItem_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "public"."FinancialModel"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BudgetLineItem" ADD CONSTRAINT "BudgetLineItem_erpConnectionId_fkey" FOREIGN KEY ("erpConnectionId") REFERENCES "public"."ERPConnection"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ERPConnection" ADD CONSTRAINT "ERPConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FinancialModel" ADD CONSTRAINT "FinancialModel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FinancialModel" ADD CONSTRAINT "FinancialModel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ModelSnapshot" ADD CONSTRAINT "ModelSnapshot_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "public"."FinancialModel"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "public"."FinancialModel"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "AgentConversation_projectId_idx" ON "AgentConversation" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "AgentConversation_userId_idx" ON "AgentConversation" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "AgentInsight_projectId_idx" ON "AgentInsight" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "AgentInsight_userId_idx" ON "AgentInsight" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "AgentInsight_reportId_idx" ON "AgentInsight" USING btree ("reportId");--> statement-breakpoint
CREATE INDEX "AgentMessage_conversationId_idx" ON "AgentMessage" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX "AgentMessage_conversationId_createdAt_idx" ON "AgentMessage" USING btree ("conversationId","createdAt");--> statement-breakpoint
CREATE INDEX "AssumptionHistory_assumptionId_idx" ON "AssumptionHistory" USING btree ("assumptionId");--> statement-breakpoint
CREATE INDEX "AssumptionHistory_createdAt_idx" ON "AssumptionHistory" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "Assumption_projectId_idx" ON "Assumption" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "Assumption_projectId_category_idx" ON "Assumption" USING btree ("projectId","category");--> statement-breakpoint
CREATE INDEX "Assumption_scenarioId_idx" ON "Assumption" USING btree ("scenarioId");--> statement-breakpoint
CREATE INDEX "Assumption_scenarioId_category_idx" ON "Assumption" USING btree ("scenarioId","category");--> statement-breakpoint
CREATE INDEX "BudgetLineItem_modelId_idx" ON "BudgetLineItem" USING btree ("modelId");--> statement-breakpoint
CREATE INDEX "BudgetLineItem_category_idx" ON "BudgetLineItem" USING btree ("category");--> statement-breakpoint
CREATE INDEX "Embedding_projectId_idx" ON "Embedding" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "Embedding_source_idx" ON "Embedding" USING btree ("sourceType","sourceId");--> statement-breakpoint
CREATE INDEX "Embedding_vector_idx" ON "Embedding" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "ERPConnection_userId_idx" ON "ERPConnection" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ERPConnection_status_idx" ON "ERPConnection" USING btree ("status");--> statement-breakpoint
CREATE INDEX "FinancialModel_userId_idx" ON "FinancialModel" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "FinancialModel_projectId_idx" ON "FinancialModel" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "FinancialModel_status_idx" ON "FinancialModel" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "IndustryTemplate_slug_key" ON "IndustryTemplate" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "IndustryTemplate_category_idx" ON "IndustryTemplate" USING btree ("category");--> statement-breakpoint
CREATE INDEX "IndustryTemplate_isActive_idx" ON "IndustryTemplate" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "ModelSnapshot_modelId_idx" ON "ModelSnapshot" USING btree ("modelId");--> statement-breakpoint
CREATE INDEX "ModelSnapshot_createdAt_idx" ON "ModelSnapshot" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "Scenario_modelId_idx" ON "Scenario" USING btree ("modelId");--> statement-breakpoint
CREATE UNIQUE INDEX "Scenario_modelId_isBase_key" ON "Scenario" USING btree ("modelId","isBase") WHERE "isBase" = true;