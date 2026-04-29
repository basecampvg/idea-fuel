-- Enable Row Level Security on every public-schema table.
--
-- Context:
-- - IdeaFuel does not use Supabase Auth. Users live in public."User".
-- - All DB reads/writes go through the Next.js/Node server using a role
--   with BYPASSRLS (`postgres` via DATABASE_URL, or `service_role` via
--   the service-role key). RLS does not affect server-mediated traffic.
-- - No client code uses the Supabase anon key to talk to the DB directly
--   (verified via grep across packages/web, packages/mobile).
--
-- Effect of enabling RLS with no policies:
-- - Service-role / postgres connections: unchanged (BYPASSRLS).
-- - Anon-key / non-bypass connections: denied on every table.
-- - Defense in depth: if an anon key is ever accidentally wired to the
--   client, or if Supabase Studio is opened as a non-admin, nothing is
--   readable.
--
-- If Supabase Auth is adopted later, add explicit `USING (auth.uid() =
-- <user_id_column>)` policies per table before users can hit the DB via
-- the Supabase JS client.
--
-- Applying this migration is safe against the running app. Verify
-- post-apply by hitting the app end-to-end and confirming nothing 404s
-- or 500s on a DB read path.

-- =============================================================================
-- User identity & auth (next-auth)
-- =============================================================================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- =============================================================================
-- Core product tables (user-owned content)
-- =============================================================================
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ProjectAttachment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "Interview" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "Research" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "Thought" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ThoughtAttachment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ThoughtCluster" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ThoughtComment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ThoughtConnection" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ThoughtEvent" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "Cluster" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "CrystallizedIdea" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "UserLabel" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "Embedding" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- =============================================================================
-- Customer interview feature
-- =============================================================================
ALTER TABLE "CustomerInterview" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "InterviewResponse" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "NdaSignature" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- =============================================================================
-- Financial modeling
-- =============================================================================
ALTER TABLE "FinancialModel" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "BudgetLineItem" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "Scenario" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ModelModule" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ModelSnapshot" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "Assumption" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "AssumptionHistory" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ERPConnection" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- =============================================================================
-- Agent & AI classification
-- =============================================================================
ALTER TABLE "AgentConversation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "AgentMessage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "AgentInsight" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "AIClassification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- =============================================================================
-- Billing & usage
-- =============================================================================
ALTER TABLE "CreditTransaction" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "TokenUsage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- =============================================================================
-- Admin & audit
-- =============================================================================
ALTER TABLE "AdminConfig" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "AdminIPWhitelist" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ConfigAuditLog" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- =============================================================================
-- Public / content tables
-- =============================================================================
ALTER TABLE "BlogPost" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "EmailCapture" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "IndustryTemplate" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- =============================================================================
-- Daily trend / research infrastructure
-- =============================================================================
ALTER TABLE "DailyPick" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "DailyRun" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "TrendSeries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "SerpSnapshot" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "QueryCandidate" ENABLE ROW LEVEL SECURITY;
