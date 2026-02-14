DROP INDEX "AIClassification_payloadHash_idx";--> statement-breakpoint
DROP INDEX "AIClassification_targetType_targetId_idx";--> statement-breakpoint
DROP INDEX "AdminIPWhitelist_ipAddress_idx";--> statement-breakpoint
DROP INDEX "AdminIPWhitelist_ipAddress_key";--> statement-breakpoint
DROP INDEX "EmailCapture_beehiivSynced_idx";--> statement-breakpoint
DROP INDEX "EmailCapture_email_idx";--> statement-breakpoint
DROP INDEX "EmailCapture_email_key";--> statement-breakpoint
DROP INDEX "EmailCapture_source_idx";--> statement-breakpoint
DROP INDEX "Session_sessionToken_key";--> statement-breakpoint
DROP INDEX "Project_status_idx";--> statement-breakpoint
DROP INDEX "Project_userId_idx";--> statement-breakpoint
DROP INDEX "Interview_lastActiveAt_idx";--> statement-breakpoint
DROP INDEX "Interview_mode_idx";--> statement-breakpoint
DROP INDEX "Interview_projectId_idx";--> statement-breakpoint
DROP INDEX "Interview_status_idx";--> statement-breakpoint
DROP INDEX "Interview_userId_idx";--> statement-breakpoint
DROP INDEX "VerificationToken_identifier_token_key";--> statement-breakpoint
DROP INDEX "VerificationToken_token_key";--> statement-breakpoint
DROP INDEX "Research_currentPhase_idx";--> statement-breakpoint
DROP INDEX "Research_projectId_key";--> statement-breakpoint
DROP INDEX "Research_status_idx";--> statement-breakpoint
DROP INDEX "Report_projectId_idx";--> statement-breakpoint
DROP INDEX "Report_status_idx";--> statement-breakpoint
DROP INDEX "Report_tier_idx";--> statement-breakpoint
DROP INDEX "Report_type_idx";--> statement-breakpoint
DROP INDEX "Report_userId_idx";--> statement-breakpoint
DROP INDEX "AdminConfig_category_idx";--> statement-breakpoint
DROP INDEX "AdminConfig_key_key";--> statement-breakpoint
DROP INDEX "User_email_key";--> statement-breakpoint
DROP INDEX "BlogPost_authorId_idx";--> statement-breakpoint
DROP INDEX "BlogPost_publishedAt_idx";--> statement-breakpoint
DROP INDEX "BlogPost_slug_key";--> statement-breakpoint
DROP INDEX "BlogPost_status_idx";--> statement-breakpoint
DROP INDEX "DailyRun_dateLocal_idx";--> statement-breakpoint
DROP INDEX "DailyRun_status_idx";--> statement-breakpoint
DROP INDEX "ConfigAuditLog_changedAt_idx";--> statement-breakpoint
DROP INDEX "ConfigAuditLog_configKey_idx";--> statement-breakpoint
DROP INDEX "TokenUsage_createdAt_idx";--> statement-breakpoint
DROP INDEX "TokenUsage_functionName_idx";--> statement-breakpoint
DROP INDEX "TokenUsage_model_idx";--> statement-breakpoint
DROP INDEX "TokenUsage_userId_idx";--> statement-breakpoint
DROP INDEX "TrendSeries_fetchedAt_idx";--> statement-breakpoint
DROP INDEX "TrendSeries_query_geo_timeframe_idx";--> statement-breakpoint
DROP INDEX "SerpSnapshot_fetchedAt_idx";--> statement-breakpoint
DROP INDEX "SerpSnapshot_query_geo_idx";--> statement-breakpoint
DROP INDEX "AuditLog_action_idx";--> statement-breakpoint
DROP INDEX "AuditLog_createdAt_idx";--> statement-breakpoint
DROP INDEX "AuditLog_userId_idx";--> statement-breakpoint
DROP INDEX "Account_provider_providerAccountId_key";--> statement-breakpoint
DROP INDEX "QueryCandidate_filterPassed_idx";--> statement-breakpoint
DROP INDEX "QueryCandidate_normalizedQuery_idx";--> statement-breakpoint
DROP INDEX "QueryCandidate_runId_idx";--> statement-breakpoint
DROP INDEX "Cluster_canonicalQuery_idx";--> statement-breakpoint
DROP INDEX "Cluster_combinedScore_idx";--> statement-breakpoint
DROP INDEX "Cluster_runId_idx";--> statement-breakpoint
DROP INDEX "DailyPick_dateLocal_idx";--> statement-breakpoint
DROP INDEX "DailyPick_status_idx";--> statement-breakpoint
ALTER TABLE "BlogPost" ALTER COLUMN "tags" SET DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "BlogPost" ALTER COLUMN "tags" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "Project_userId_status_idx" ON "Project" USING btree ("userId","status");--> statement-breakpoint
CREATE INDEX "Interview_projectId_status_idx" ON "Interview" USING btree ("projectId","status");--> statement-breakpoint
CREATE INDEX "Research_status_currentPhase_idx" ON "Research" USING btree ("status","currentPhase");--> statement-breakpoint
CREATE INDEX "Report_projectId_type_idx" ON "Report" USING btree ("projectId","type");--> statement-breakpoint
CREATE INDEX "AIClassification_payloadHash_idx" ON "AIClassification" USING btree ("payloadHash");--> statement-breakpoint
CREATE INDEX "AIClassification_targetType_targetId_idx" ON "AIClassification" USING btree ("targetType","targetId");--> statement-breakpoint
CREATE INDEX "AdminIPWhitelist_ipAddress_idx" ON "AdminIPWhitelist" USING btree ("ipAddress");--> statement-breakpoint
CREATE UNIQUE INDEX "AdminIPWhitelist_ipAddress_key" ON "AdminIPWhitelist" USING btree ("ipAddress");--> statement-breakpoint
CREATE INDEX "EmailCapture_beehiivSynced_idx" ON "EmailCapture" USING btree ("beehiivSynced");--> statement-breakpoint
CREATE INDEX "EmailCapture_email_idx" ON "EmailCapture" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "EmailCapture_email_key" ON "EmailCapture" USING btree ("email");--> statement-breakpoint
CREATE INDEX "EmailCapture_source_idx" ON "EmailCapture" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session" USING btree ("sessionToken");--> statement-breakpoint
CREATE INDEX "Project_status_idx" ON "Project" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Project_userId_idx" ON "Project" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Interview_lastActiveAt_idx" ON "Interview" USING btree ("lastActiveAt");--> statement-breakpoint
CREATE INDEX "Interview_mode_idx" ON "Interview" USING btree ("mode");--> statement-breakpoint
CREATE INDEX "Interview_projectId_idx" ON "Interview" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "Interview_status_idx" ON "Interview" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Interview_userId_idx" ON "Interview" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken" USING btree ("identifier","token");--> statement-breakpoint
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken" USING btree ("token");--> statement-breakpoint
CREATE INDEX "Research_currentPhase_idx" ON "Research" USING btree ("currentPhase");--> statement-breakpoint
CREATE UNIQUE INDEX "Research_projectId_key" ON "Research" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "Research_status_idx" ON "Research" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Report_projectId_idx" ON "Report" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "Report_status_idx" ON "Report" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Report_tier_idx" ON "Report" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "Report_type_idx" ON "Report" USING btree ("type");--> statement-breakpoint
CREATE INDEX "Report_userId_idx" ON "Report" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "AdminConfig_category_idx" ON "AdminConfig" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "AdminConfig_key_key" ON "AdminConfig" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "User_email_key" ON "User" USING btree ("email");--> statement-breakpoint
CREATE INDEX "BlogPost_authorId_idx" ON "BlogPost" USING btree ("authorId");--> statement-breakpoint
CREATE INDEX "BlogPost_publishedAt_idx" ON "BlogPost" USING btree ("publishedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "BlogPost_status_idx" ON "BlogPost" USING btree ("status");--> statement-breakpoint
CREATE INDEX "DailyRun_dateLocal_idx" ON "DailyRun" USING btree ("dateLocal");--> statement-breakpoint
CREATE INDEX "DailyRun_status_idx" ON "DailyRun" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ConfigAuditLog_changedAt_idx" ON "ConfigAuditLog" USING btree ("changedAt");--> statement-breakpoint
CREATE INDEX "ConfigAuditLog_configKey_idx" ON "ConfigAuditLog" USING btree ("configKey");--> statement-breakpoint
CREATE INDEX "TokenUsage_createdAt_idx" ON "TokenUsage" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "TokenUsage_functionName_idx" ON "TokenUsage" USING btree ("functionName");--> statement-breakpoint
CREATE INDEX "TokenUsage_model_idx" ON "TokenUsage" USING btree ("model");--> statement-breakpoint
CREATE INDEX "TokenUsage_userId_idx" ON "TokenUsage" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "TrendSeries_fetchedAt_idx" ON "TrendSeries" USING btree ("fetchedAt");--> statement-breakpoint
CREATE INDEX "TrendSeries_query_geo_timeframe_idx" ON "TrendSeries" USING btree ("query","geo","timeframe");--> statement-breakpoint
CREATE INDEX "SerpSnapshot_fetchedAt_idx" ON "SerpSnapshot" USING btree ("fetchedAt");--> statement-breakpoint
CREATE INDEX "SerpSnapshot_query_geo_idx" ON "SerpSnapshot" USING btree ("query","geo");--> statement-breakpoint
CREATE INDEX "AuditLog_action_idx" ON "AuditLog" USING btree ("action");--> statement-breakpoint
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account" USING btree ("provider","providerAccountId");--> statement-breakpoint
CREATE INDEX "QueryCandidate_filterPassed_idx" ON "QueryCandidate" USING btree ("filterPassed");--> statement-breakpoint
CREATE INDEX "QueryCandidate_normalizedQuery_idx" ON "QueryCandidate" USING btree ("normalizedQuery");--> statement-breakpoint
CREATE INDEX "QueryCandidate_runId_idx" ON "QueryCandidate" USING btree ("runId");--> statement-breakpoint
CREATE INDEX "Cluster_canonicalQuery_idx" ON "Cluster" USING btree ("canonicalQuery");--> statement-breakpoint
CREATE INDEX "Cluster_combinedScore_idx" ON "Cluster" USING btree ("combinedScore");--> statement-breakpoint
CREATE INDEX "Cluster_runId_idx" ON "Cluster" USING btree ("runId");--> statement-breakpoint
CREATE INDEX "DailyPick_dateLocal_idx" ON "DailyPick" USING btree ("dateLocal");--> statement-breakpoint
CREATE INDEX "DailyPick_status_idx" ON "DailyPick" USING btree ("status");