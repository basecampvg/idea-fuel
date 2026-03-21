import { pgTable, index, text, jsonb, timestamp, uniqueIndex, boolean, foreignKey, integer, doublePrecision, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const AIClassificationTargetType = pgEnum("AIClassificationTargetType", ['QUERY', 'CLUSTER', 'WINNER_REPORT'])
export const BlogPostStatus = pgEnum("BlogPostStatus", ['DRAFT', 'PUBLISHED', 'ARCHIVED'])
export const ConfigType = pgEnum("ConfigType", ['STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'SELECT'])
export const DailyPickStatus = pgEnum("DailyPickStatus", ['ACTIVE', 'ARCHIVED'])
export const DailyRunStatus = pgEnum("DailyRunStatus", ['SUCCESS', 'PARTIAL', 'FAILED'])
export const InterviewMode = pgEnum("InterviewMode", ['SPARK', 'LIGHT', 'IN_DEPTH'])
export const InterviewStatus = pgEnum("InterviewStatus", ['IN_PROGRESS', 'COMPLETE', 'ABANDONED'])
export const ProjectStatus = pgEnum("ProjectStatus", ['CAPTURED', 'INTERVIEWING', 'RESEARCHING', 'COMPLETE'])
export const ReportStatus = pgEnum("ReportStatus", ['DRAFT', 'GENERATING', 'COMPLETE', 'FAILED'])
export const ReportTier = pgEnum("ReportTier", ['BASIC', 'PRO', 'FULL'])
export const ReportType = pgEnum("ReportType", ['BUSINESS_PLAN', 'POSITIONING', 'COMPETITIVE_ANALYSIS', 'WHY_NOW', 'PROOF_SIGNALS', 'KEYWORDS_SEO', 'CUSTOMER_PROFILE', 'VALUE_EQUATION', 'VALUE_LADDER', 'GO_TO_MARKET'])
export const ResearchPhase = pgEnum("ResearchPhase", ['QUEUED', 'DEEP_RESEARCH', 'SYNTHESIS', 'SOCIAL_RESEARCH', 'REPORT_GENERATION', 'BUSINESS_PLAN_GENERATION', 'COMPLETE', 'QUERY_GENERATION', 'DATA_COLLECTION'])
export const ResearchStatus = pgEnum("ResearchStatus", ['PENDING', 'IN_PROGRESS', 'COMPLETE', 'FAILED'])
export const SparkJobStatus = pgEnum("SparkJobStatus", ['QUEUED', 'RUNNING_KEYWORDS', 'RUNNING_RESEARCH', 'RUNNING_PARALLEL', 'SYNTHESIZING', 'ENRICHING', 'COMPLETE', 'PARTIAL_COMPLETE', 'FAILED'])
export const SubscriptionTier = pgEnum("SubscriptionTier", ['FREE', 'PRO', 'ENTERPRISE', 'SCALE', 'TESTER'])
export const UserRole = pgEnum("UserRole", ['USER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'])


export const AIClassification = pgTable("AIClassification", {
	id: text().primaryKey().notNull(),
	targetType: AIClassificationTargetType().notNull(),
	targetId: text().notNull(),
	model: text().notNull(),
	schemaVersion: text().notNull(),
	payloadHash: text().notNull(),
	outputJson: jsonb().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("AIClassification_payloadHash_idx").using("btree", table.payloadHash.asc().nullsLast().op("text_ops")),
	index("AIClassification_targetType_targetId_idx").using("btree", table.targetType.asc().nullsLast().op("text_ops"), table.targetId.asc().nullsLast().op("text_ops")),
]);

export const AdminIPWhitelist = pgTable("AdminIPWhitelist", {
	id: text().primaryKey().notNull(),
	ipAddress: text().notNull(),
	label: text(),
	addedBy: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'string' }),
}, (table) => [
	index("AdminIPWhitelist_ipAddress_idx").using("btree", table.ipAddress.asc().nullsLast().op("text_ops")),
	uniqueIndex("AdminIPWhitelist_ipAddress_key").using("btree", table.ipAddress.asc().nullsLast().op("text_ops")),
]);

export const EmailCapture = pgTable("EmailCapture", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	source: text().default('landing').notNull(),
	beehiivSynced: boolean().default(false).notNull(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("EmailCapture_beehiivSynced_idx").using("btree", table.beehiivSynced.asc().nullsLast().op("bool_ops")),
	index("EmailCapture_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	uniqueIndex("EmailCapture_email_key").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("EmailCapture_source_idx").using("btree", table.source.asc().nullsLast().op("text_ops")),
]);

export const Session = pgTable("Session", {
	id: text().primaryKey().notNull(),
	sessionToken: text().notNull(),
	userId: text().notNull(),
	expires: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("Session_sessionToken_key").using("btree", table.sessionToken.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [User.id],
			name: "Session_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const Project = pgTable("Project", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	notes: text(),
	status: ProjectStatus().default('CAPTURED').notNull(),
	userId: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("Project_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("Project_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [User.id],
			name: "Project_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const Interview = pgTable("Interview", {
	id: text().primaryKey().notNull(),
	mode: InterviewMode().default('LIGHT').notNull(),
	status: InterviewStatus().default('IN_PROGRESS').notNull(),
	currentTurn: integer().default(0).notNull(),
	maxTurns: integer().default(5).notNull(),
	messages: jsonb().notNull(),
	collectedData: jsonb(),
	confidenceScore: integer().default(0).notNull(),
	summary: text(),
	lastActiveAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	lastMessageAt: timestamp({ precision: 3, mode: 'string' }),
	resumeContext: text(),
	isExpired: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	projectId: text().notNull(),
	userId: text().notNull(),
}, (table) => [
	index("Interview_lastActiveAt_idx").using("btree", table.lastActiveAt.asc().nullsLast().op("timestamp_ops")),
	index("Interview_mode_idx").using("btree", table.mode.asc().nullsLast().op("enum_ops")),
	index("Interview_projectId_idx").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
	index("Interview_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("Interview_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [Project.id],
			name: "Interview_projectId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [User.id],
			name: "Interview_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const VerificationToken = pgTable("VerificationToken", {
	identifier: text().notNull(),
	token: text().notNull(),
	expires: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("VerificationToken_identifier_token_key").using("btree", table.identifier.asc().nullsLast().op("text_ops"), table.token.asc().nullsLast().op("text_ops")),
	uniqueIndex("VerificationToken_token_key").using("btree", table.token.asc().nullsLast().op("text_ops")),
]);

export const Research = pgTable("Research", {
	id: text().primaryKey().notNull(),
	status: ResearchStatus().default('PENDING').notNull(),
	currentPhase: ResearchPhase().default('QUEUED').notNull(),
	progress: integer().default(0).notNull(),
	estimatedCompletion: timestamp({ precision: 3, mode: 'string' }),
	startedAt: timestamp({ precision: 3, mode: 'string' }),
	completedAt: timestamp({ precision: 3, mode: 'string' }),
	generatedQueries: jsonb(),
	rawData: jsonb(),
	rawDeepResearch: jsonb(),
	researchChunks: jsonb(),
	synthesizedInsights: jsonb(),
	marketAnalysis: jsonb(),
	competitors: jsonb(),
	painPoints: jsonb(),
	positioning: jsonb(),
	whyNow: jsonb(),
	proofSignals: jsonb(),
	keywords: jsonb(),
	opportunityScore: integer(),
	problemScore: integer(),
	feasibilityScore: integer(),
	whyNowScore: integer(),
	scoreJustifications: jsonb(),
	scoreMetadata: jsonb(),
	revenuePotential: jsonb(),
	executionDifficulty: jsonb(),
	gtmClarity: jsonb(),
	founderFit: jsonb(),
	keywordTrends: jsonb(),
	valueLadder: jsonb(),
	actionPrompts: jsonb(),
	userStory: jsonb(),
	socialProof: jsonb(),
	marketSizing: jsonb(),
	techStack: jsonb(),
	businessPlan: text(),
	sparkStatus: SparkJobStatus(),
	sparkKeywords: jsonb(),
	sparkResult: jsonb(),
	sparkStartedAt: timestamp({ precision: 3, mode: 'string' }),
	sparkCompletedAt: timestamp({ precision: 3, mode: 'string' }),
	sparkError: text(),
	errorMessage: text(),
	errorPhase: ResearchPhase(),
	retryCount: integer().default(0).notNull(),
	notesSnapshot: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	projectId: text().notNull(),
}, (table) => [
	index("Research_currentPhase_idx").using("btree", table.currentPhase.asc().nullsLast().op("enum_ops")),
	uniqueIndex("Research_projectId_key").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
	index("Research_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [Project.id],
			name: "Research_projectId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const Report = pgTable("Report", {
	id: text().primaryKey().notNull(),
	type: ReportType().notNull(),
	tier: ReportTier().notNull(),
	title: text().notNull(),
	content: text().notNull(),
	sections: jsonb().notNull(),
	version: integer().default(1).notNull(),
	status: ReportStatus().default('DRAFT').notNull(),
	pdfUrl: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	projectId: text().notNull(),
	userId: text().notNull(),
}, (table) => [
	index("Report_projectId_idx").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
	index("Report_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("Report_tier_idx").using("btree", table.tier.asc().nullsLast().op("enum_ops")),
	index("Report_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	index("Report_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [Project.id],
			name: "Report_projectId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [User.id],
			name: "Report_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const AdminConfig = pgTable("AdminConfig", {
	id: text().primaryKey().notNull(),
	key: text().notNull(),
	value: jsonb().notNull(),
	type: ConfigType().default('STRING').notNull(),
	category: text().notNull(),
	label: text().notNull(),
	description: text(),
	options: jsonb(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	updatedBy: text(),
}, (table) => [
	index("AdminConfig_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	uniqueIndex("AdminConfig_key_key").using("btree", table.key.asc().nullsLast().op("text_ops")),
]);

export const User = pgTable("User", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	emailVerified: timestamp({ precision: 3, mode: 'string' }),
	name: text(),
	passwordHash: text(),
	image: text(),
	subscription: SubscriptionTier().default('FREE').notNull(),
	isAdmin: boolean().default(false).notNull(),
	role: UserRole().default('USER').notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("User_email_key").using("btree", table.email.asc().nullsLast().op("text_ops")),
]);

export const BlogPost = pgTable("BlogPost", {
	id: text().primaryKey().notNull(),
	slug: text().notNull(),
	title: text().notNull(),
	description: text(),
	content: jsonb().notNull(),
	coverImage: text(),
	status: BlogPostStatus().default('DRAFT').notNull(),
	publishedAt: timestamp({ precision: 3, mode: 'string' }),
	readingTime: text(),
	wordCount: integer().default(0).notNull(),
	tags: text().array(),
	authorId: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("BlogPost_authorId_idx").using("btree", table.authorId.asc().nullsLast().op("text_ops")),
	index("BlogPost_publishedAt_idx").using("btree", table.publishedAt.asc().nullsLast().op("timestamp_ops")),
	uniqueIndex("BlogPost_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	index("BlogPost_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [User.id],
			name: "BlogPost_authorId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const DailyRun = pgTable("DailyRun", {
	id: text().primaryKey().notNull(),
	dateLocal: text().notNull(),
	startedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	finishedAt: timestamp({ precision: 3, mode: 'string' }),
	status: DailyRunStatus().notNull(),
	metrics: jsonb(),
	logsRef: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("DailyRun_dateLocal_idx").using("btree", table.dateLocal.asc().nullsLast().op("text_ops")),
	index("DailyRun_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
]);

export const ConfigAuditLog = pgTable("ConfigAuditLog", {
	id: text().primaryKey().notNull(),
	configKey: text().notNull(),
	oldValue: jsonb(),
	newValue: jsonb().notNull(),
	changedBy: text().notNull(),
	changedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	reason: text(),
}, (table) => [
	index("ConfigAuditLog_changedAt_idx").using("btree", table.changedAt.asc().nullsLast().op("timestamp_ops")),
	index("ConfigAuditLog_configKey_idx").using("btree", table.configKey.asc().nullsLast().op("text_ops")),
]);

export const TokenUsage = pgTable("TokenUsage", {
	id: text().primaryKey().notNull(),
	userId: text(),
	projectId: text(),
	functionName: text().notNull(),
	model: text().notNull(),
	inputTokens: integer().notNull(),
	outputTokens: integer().notNull(),
	totalTokens: integer().notNull(),
	cachedTokens: integer().default(0).notNull(),
	costEstimate: doublePrecision(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("TokenUsage_createdAt_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("TokenUsage_functionName_idx").using("btree", table.functionName.asc().nullsLast().op("text_ops")),
	index("TokenUsage_model_idx").using("btree", table.model.asc().nullsLast().op("text_ops")),
	index("TokenUsage_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const TrendSeries = pgTable("TrendSeries", {
	id: text().primaryKey().notNull(),
	query: text().notNull(),
	geo: text().notNull(),
	timeframe: text().notNull(),
	points: jsonb().notNull(),
	fetchedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("TrendSeries_fetchedAt_idx").using("btree", table.fetchedAt.asc().nullsLast().op("timestamp_ops")),
	index("TrendSeries_query_geo_timeframe_idx").using("btree", table.query.asc().nullsLast().op("text_ops"), table.geo.asc().nullsLast().op("text_ops"), table.timeframe.asc().nullsLast().op("text_ops")),
]);

export const SerpSnapshot = pgTable("SerpSnapshot", {
	id: text().primaryKey().notNull(),
	query: text().notNull(),
	geo: text().notNull(),
	device: text().default('desktop').notNull(),
	adsCount: integer().notNull(),
	shoppingPresent: boolean().notNull(),
	topStoriesPresent: boolean().notNull(),
	topDomains: jsonb().notNull(),
	snippetsSample: jsonb().notNull(),
	rawFeatures: jsonb(),
	fetchedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("SerpSnapshot_fetchedAt_idx").using("btree", table.fetchedAt.asc().nullsLast().op("timestamp_ops")),
	index("SerpSnapshot_query_geo_idx").using("btree", table.query.asc().nullsLast().op("text_ops"), table.geo.asc().nullsLast().op("text_ops")),
]);

export const AuditLog = pgTable("AuditLog", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	action: text().notNull(),
	resource: text().notNull(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("AuditLog_action_idx").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("AuditLog_createdAt_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("AuditLog_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [User.id],
			name: "AuditLog_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const Account = pgTable("Account", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	type: text().notNull(),
	provider: text().notNull(),
	providerAccountId: text().notNull(),
	refresh_token: text(),
	access_token: text(),
	expires_at: integer(),
	token_type: text(),
	scope: text(),
	id_token: text(),
	session_state: text(),
}, (table) => [
	uniqueIndex("Account_provider_providerAccountId_key").using("btree", table.provider.asc().nullsLast().op("text_ops"), table.providerAccountId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [User.id],
			name: "Account_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const QueryCandidate = pgTable("QueryCandidate", {
	id: text().primaryKey().notNull(),
	runId: text().notNull(),
	query: text().notNull(),
	normalizedQuery: text().notNull(),
	source: text().notNull(),
	discoveredAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	filterPassed: boolean().default(false).notNull(),
	filterPassReason: text(),
	matchedPatterns: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("QueryCandidate_filterPassed_idx").using("btree", table.filterPassed.asc().nullsLast().op("bool_ops")),
	index("QueryCandidate_normalizedQuery_idx").using("btree", table.normalizedQuery.asc().nullsLast().op("text_ops")),
	index("QueryCandidate_runId_idx").using("btree", table.runId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.runId],
			foreignColumns: [DailyRun.id],
			name: "QueryCandidate_runId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const Cluster = pgTable("Cluster", {
	id: text().primaryKey().notNull(),
	runId: text().notNull(),
	title: text().notNull(),
	canonicalQuery: text().notNull(),
	memberQueries: jsonb().notNull(),
	growthScore: integer().notNull(),
	purchaseProofScore: integer().notNull(),
	painPointScore: integer().notNull(),
	newsSpikeRisk: doublePrecision().notNull(),
	combinedScore: doublePrecision().notNull(),
	winnerReason: jsonb().notNull(),
	triageIntent: text(),
	triageConfidence: doublePrecision(),
	triageCategory: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("Cluster_canonicalQuery_idx").using("btree", table.canonicalQuery.asc().nullsLast().op("text_ops")),
	index("Cluster_combinedScore_idx").using("btree", table.combinedScore.asc().nullsLast().op("float8_ops")),
	index("Cluster_runId_idx").using("btree", table.runId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.runId],
			foreignColumns: [DailyRun.id],
			name: "Cluster_runId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const DailyPick = pgTable("DailyPick", {
	id: text().primaryKey().notNull(),
	dateLocal: text().notNull(),
	winnerClusterId: text().notNull(),
	revision: integer().default(1).notNull(),
	status: DailyPickStatus().default('ACTIVE').notNull(),
	publishedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("DailyPick_dateLocal_idx").using("btree", table.dateLocal.asc().nullsLast().op("text_ops")),
	index("DailyPick_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.winnerClusterId],
			foreignColumns: [Cluster.id],
			name: "DailyPick_winnerClusterId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);
