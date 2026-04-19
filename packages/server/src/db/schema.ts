import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  doublePrecision,
  numeric,
  index,
  uniqueIndex,
  unique,
  foreignKey,
  vector,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import {
  customerInterviews,
  interviewResponses,
  ndaSignatures,
} from './customer-interview-schema';

// =============================================================================
// ENUMS
// =============================================================================

export const subscriptionTierEnum = pgEnum('SubscriptionTier', ['FREE', 'PRO', 'ENTERPRISE', 'TESTER', 'MOBILE', 'SCALE']);
export const userRoleEnum = pgEnum('UserRole', ['USER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN']);
export const projectStatusEnum = pgEnum('ProjectStatus', ['CAPTURED', 'INTERVIEWING', 'RESEARCHING', 'COMPLETE']);
export const projectModeEnum = pgEnum('ProjectMode', ['LAUNCH', 'EXPAND']);
export const creditTransactionTypeEnum = pgEnum('CreditTransactionType', ['PURCHASE', 'CONSUME', 'REFUND', 'GRANT']);
export const interviewModeEnum = pgEnum('InterviewMode', ['SPARK', 'LIGHT', 'IN_DEPTH']);
export const interviewStatusEnum = pgEnum('InterviewStatus', ['IN_PROGRESS', 'COMPLETE', 'ABANDONED']);
export const researchStatusEnum = pgEnum('ResearchStatus', ['PENDING', 'IN_PROGRESS', 'COMPLETE', 'FAILED']);
export const researchPhaseEnum = pgEnum('ResearchPhase', [
  'QUEUED', 'DEEP_RESEARCH', 'SYNTHESIS', 'SOCIAL_RESEARCH', 'REPORT_GENERATION',
  'BUSINESS_PLAN_GENERATION', 'COMPLETE', 'QUERY_GENERATION', 'DATA_COLLECTION',
]);
export const sparkJobStatusEnum = pgEnum('SparkJobStatus', [
  'QUEUED', 'RUNNING_KEYWORDS', 'RUNNING_RESEARCH', 'RUNNING_PARALLEL',
  'SYNTHESIZING', 'ENRICHING', 'COMPLETE', 'PARTIAL_COMPLETE', 'FAILED',
]);
export const reportTypeEnum = pgEnum('ReportType', [
  'BUSINESS_PLAN', 'POSITIONING', 'COMPETITIVE_ANALYSIS', 'WHY_NOW', 'PROOF_SIGNALS',
  'KEYWORDS_SEO', 'CUSTOMER_PROFILE', 'VALUE_EQUATION', 'VALUE_LADDER', 'GO_TO_MARKET',
  'CUSTOMER_DISCOVERY',
]);
export const reportTierEnum = pgEnum('ReportTier', ['BASIC', 'PRO', 'FULL']);
export const reportStatusEnum = pgEnum('ReportStatus', ['DRAFT', 'GENERATING', 'COMPLETE', 'FAILED']);
export const configTypeEnum = pgEnum('ConfigType', ['STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'SELECT']);
export const dailyRunStatusEnum = pgEnum('DailyRunStatus', ['SUCCESS', 'PARTIAL', 'FAILED']);
export const dailyPickStatusEnum = pgEnum('DailyPickStatus', ['ACTIVE', 'ARCHIVED']);
export const blogPostStatusEnum = pgEnum('BlogPostStatus', ['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export const aiClassificationTargetTypeEnum = pgEnum('AIClassificationTargetType', ['QUERY', 'CLUSTER', 'WINNER_REPORT']);
export const agentConversationStatusEnum = pgEnum('AgentConversationStatus', ['ACTIVE', 'ARCHIVED']);
export const embeddingSourceTypeEnum = pgEnum('EmbeddingSourceType', ['REPORT', 'RESEARCH', 'INTERVIEW', 'NOTES', 'SERPAPI', 'THOUGHT']);

// Assumptions Engine enums
export const assumptionCategoryEnum = pgEnum('AssumptionCategory', [
  'PRICING', 'ACQUISITION', 'RETENTION', 'MARKET', 'COSTS', 'FUNDING', 'TIMELINE',
]);
export const assumptionConfidenceEnum = pgEnum('AssumptionConfidence', [
  'USER', 'RESEARCHED', 'AI_ESTIMATE', 'CALCULATED',
]);
export const assumptionValueTypeEnum = pgEnum('AssumptionValueType', [
  'NUMBER', 'PERCENTAGE', 'CURRENCY', 'TEXT', 'DATE', 'SELECT',
]);
export const assumptionTierEnum = pgEnum('AssumptionTier', [
  'SPARK', 'LIGHT', 'IN_DEPTH',
]);
export const assumptionAggregationEnum = pgEnum('AssumptionAggregation', [
  'SUM', 'AVERAGE', 'CUSTOM',
]);

// Financial Modeling enums
export const knowledgeLevelEnum = pgEnum('KnowledgeLevel', ['BEGINNER', 'STANDARD', 'EXPERT']);
export const financialModelStatusEnum = pgEnum('FinancialModelStatus', ['DRAFT', 'ACTIVE', 'ARCHIVED']);
export const erpProviderEnum = pgEnum('ERPProvider', ['QUICKBOOKS', 'XERO']);
export const erpConnectionStatusEnum = pgEnum('ERPConnectionStatus', ['ACTIVE', 'EXPIRED', 'REVOKED']);
export const snapshotActionEnum = pgEnum('SnapshotAction', ['MANUAL', 'AUTO_SAVE']);
export const templateCategoryEnum = pgEnum('TemplateCategory', [
  'TECH', 'SERVICES', 'RETAIL', 'FOOD', 'CONSTRUCTION',
  'HEALTHCARE', 'REAL_ESTATE', 'MANUFACTURING', 'NONPROFIT', 'FREELANCER',
]);
export const noteTypeEnum = pgEnum('NoteType', ['QUICK', 'AI']); // Keep for migration compat
export const thoughtTypeEnum = pgEnum('ThoughtType', ['problem', 'solution', 'what_if', 'observation', 'question']);

// TypeScript types derived from enums
export type SubscriptionTier = (typeof subscriptionTierEnum.enumValues)[number];
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
export type InterviewMode = (typeof interviewModeEnum.enumValues)[number];
export type InterviewStatus = (typeof interviewStatusEnum.enumValues)[number];
export type ResearchStatus = (typeof researchStatusEnum.enumValues)[number];
export type ResearchPhase = (typeof researchPhaseEnum.enumValues)[number];
export type SparkJobStatus = (typeof sparkJobStatusEnum.enumValues)[number];
export type ReportType = (typeof reportTypeEnum.enumValues)[number];
export type ReportTier = (typeof reportTierEnum.enumValues)[number];
export type ReportStatus = (typeof reportStatusEnum.enumValues)[number];
export type ConfigType = (typeof configTypeEnum.enumValues)[number];
export type DailyRunStatus = (typeof dailyRunStatusEnum.enumValues)[number];
export type DailyPickStatus = (typeof dailyPickStatusEnum.enumValues)[number];
export type BlogPostStatus = (typeof blogPostStatusEnum.enumValues)[number];
export type AIClassificationTargetType = (typeof aiClassificationTargetTypeEnum.enumValues)[number];
export type AgentConversationStatus = (typeof agentConversationStatusEnum.enumValues)[number];
export type EmbeddingSourceType = (typeof embeddingSourceTypeEnum.enumValues)[number];
export type AssumptionCategory = (typeof assumptionCategoryEnum.enumValues)[number];
export type AssumptionConfidence = (typeof assumptionConfidenceEnum.enumValues)[number];
export type AssumptionValueType = (typeof assumptionValueTypeEnum.enumValues)[number];
export type AssumptionTier = (typeof assumptionTierEnum.enumValues)[number];
export type AssumptionAggregation = (typeof assumptionAggregationEnum.enumValues)[number];
export type KnowledgeLevel = (typeof knowledgeLevelEnum.enumValues)[number];
export type FinancialModelStatus = (typeof financialModelStatusEnum.enumValues)[number];
export type ERPProvider = (typeof erpProviderEnum.enumValues)[number];
export type ERPConnectionStatus = (typeof erpConnectionStatusEnum.enumValues)[number];
export type SnapshotAction = (typeof snapshotActionEnum.enumValues)[number];
export type ThoughtType = (typeof thoughtTypeEnum.enumValues)[number];
export type TemplateCategory = (typeof templateCategoryEnum.enumValues)[number];

// =============================================================================
// AUTH TABLES (User, Account, Session, VerificationToken)
// =============================================================================

export const users = pgTable('User', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  email: text().notNull(),
  emailVerified: timestamp({ precision: 3, mode: 'date' }),
  name: text(),
  passwordHash: text(),
  image: text(),
  subscription: subscriptionTierEnum().default('FREE').notNull(),
  isAdmin: boolean().default(false).notNull(),
  role: userRoleEnum().default('USER').notNull(),
  founderProfile: jsonb('founder_profile'),
  // Stripe billing fields
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripePriceId: text('stripe_price_id'),
  stripeCurrentPeriodEnd: timestamp('stripe_current_period_end', { precision: 3, mode: 'date' }),
  // Credit system (pay-as-you-go balance)
  creditBalance: integer('credit_balance').default(0).notNull(),
  // Mobile quick validation card fields
  freeCardUsed: boolean('free_card_used').default(false).notNull(),
  mobileCardCount: integer('mobile_card_count').default(0).notNull(),
  mobileCardResetAt: timestamp('mobile_card_reset_at', { precision: 3, mode: 'date' }),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('User_email_key').using('btree', table.email.asc().nullsLast()),
]);

export const accounts = pgTable('Account', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
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
  uniqueIndex('Account_provider_providerAccountId_key').using('btree', table.provider.asc().nullsLast(), table.providerAccountId.asc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'Account_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

export const sessions = pgTable('Session', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  sessionToken: text().notNull(),
  userId: text().notNull(),
  expires: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  uniqueIndex('Session_sessionToken_key').using('btree', table.sessionToken.asc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'Session_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

export const verificationTokens = pgTable('VerificationToken', {
  identifier: text().notNull(),
  token: text().notNull(),
  expires: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  uniqueIndex('VerificationToken_identifier_token_key').using('btree', table.identifier.asc().nullsLast(), table.token.asc().nullsLast()),
  uniqueIndex('VerificationToken_token_key').using('btree', table.token.asc().nullsLast()),
]);

// =============================================================================
// PROJECT
// =============================================================================

export const projects = pgTable('Project', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  title: text().notNull(),
  description: text().notNull(),
  notes: text(),
  status: projectStatusEnum().default('CAPTURED').notNull(),
  // Expand Mode (LAUNCH = 0->1 validation, EXPAND = existing business optimization)
  mode: projectModeEnum().default('LAUNCH').notNull(),
  businessContext: jsonb('business_context'),
  userId: text().notNull(),
  // Mobile quick validation card fields
  promoted: boolean().default(false).notNull(),
  promotedAt: timestamp('promoted_at', { precision: 3, mode: 'date' }),
  cardResult: jsonb('card_result'),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('Project_status_idx').using('btree', table.status.asc().nullsLast()),
  index('Project_userId_idx').using('btree', table.userId.asc().nullsLast()),
  index('Project_userId_status_idx').using('btree', table.userId.asc(), table.status.asc()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'Project_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// PROJECT ATTACHMENTS (Images attached at capture time)
// =============================================================================

export const projectAttachments = pgTable('ProjectAttachment', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  storagePath: text('storage_path').notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  order: integer().default(0).notNull(),
  aiConsent: boolean('ai_consent').default(false).notNull(),
  projectId: text('project_id').notNull(),
  userId: text('user_id').notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('ProjectAttachment_projectId_idx').using('btree', table.projectId.asc().nullsLast()),
  index('ProjectAttachment_userId_idx').using('btree', table.userId.asc().nullsLast()),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [projects.id],
    name: 'ProjectAttachment_projectId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'ProjectAttachment_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

export const projectAttachmentsRelations = relations(projectAttachments, ({ one }) => ({
  project: one(projects, { fields: [projectAttachments.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectAttachments.userId], references: [users.id] }),
}));

// =============================================================================
// THOUGHT CLUSTERS (Thought Collections)
// =============================================================================

export const thoughtClusters = pgTable('ThoughtCluster', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  name: text().notNull(),
  color: text(),
  description: text(),
  themes: jsonb().$type<any[]>().default([]),
  tensions: jsonb().$type<any[]>().default([]),
  gaps: jsonb().$type<any[]>().default([]),
  synthesis: text(),
  clusterMaturity: text('cluster_maturity').default('exploring').notNull(),
  readinessScore: doublePrecision('readiness_score'),
  dimensionCoverage: jsonb('dimension_coverage'),
  projectId: text('project_id'),
  userId: text().notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('ThoughtCluster_userId_updatedAt_idx').using('btree', table.userId.asc(), table.updatedAt.desc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'ThoughtCluster_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// Backwards compat alias
export const sandboxes = thoughtClusters;

// =============================================================================
// THOUGHTS (Brain Dump + AI Refinement)
// =============================================================================

export const thoughts = pgTable('Thought', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  title: text(),
  purpose: text('purpose').default('idea').notNull(),
  content: text().default('').notNull(),
  thoughtType: thoughtTypeEnum('thought_type'),
  typeSource: text('type_source').default('ai_auto').notNull(),
  tags: text().array().default([]),
  aiTags: text('ai_tags').array().default([]),
  maturityLevel: text('maturity_level'),
  maturityNotes: text('maturity_notes'),
  maturityHistory: jsonb('maturity_history').$type<any[]>().default([]),
  confidenceLevel: text('confidence_level'),
  thoughtNumber: integer('thought_number').notNull(),
  reactions: jsonb().$type<any[]>().default([]),
  captureMethod: text('capture_method').default('quick_text').notNull(),
  voiceMemoUrl: text('voice_memo_url'),
  transcription: text(),
  captureSource: text('capture_source'),
  aiRefinement: text('ai_refinement'),
  refinedTitle: text('refined_title'),
  refinedDescription: text('refined_description'),
  refinedTags: jsonb('refined_tags').$type<string[]>(),
  lastRefinedAt: timestamp('last_refined_at', { precision: 3, mode: 'date' }),
  lastSurfacedAt: timestamp('last_surfaced_at', { precision: 3, mode: 'date' }),
  surfaceCount: integer('surface_count').default(0).notNull(),
  dismissCount: integer('dismiss_count').default(0).notNull(),
  engageCount: integer('engage_count').default(0).notNull(),
  dismissStreak: integer('dismiss_streak').default(0).notNull(),
  resurfaceExcluded: boolean('resurface_excluded').default(false).notNull(),
  collisionIds: text('collision_ids').array().default([]),
  incubationScore: doublePrecision('incubation_score').default(0).notNull(),
  nextSurfaceAt: timestamp('next_surface_at', { precision: 3, mode: 'date' }),
  clusterId: text('cluster_id'),
  clusterPosition: integer('cluster_position'),
  sourceThoughtId: text('source_thought_id'),
  promotedProjectId: text('promoted_project_id'),
  isArchived: boolean('is_archived').default(false).notNull(),
  userId: text().notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('Thought_userId_idx').using('btree', table.userId.asc().nullsLast()),
  index('Thought_userId_updatedAt_idx').using('btree', table.userId.asc(), table.updatedAt.desc().nullsLast()),
  index('Thought_clusterId_idx').using('btree', table.clusterId.asc().nullsLast()),
  index('Thought_resurface_idx').using('btree', table.userId.asc(), table.resurfaceExcluded.asc(), table.nextSurfaceAt.asc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'Thought_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.promotedProjectId],
    foreignColumns: [projects.id],
    name: 'Thought_promotedProjectId_fkey',
  }).onUpdate('cascade').onDelete('set null'),
  foreignKey({
    columns: [table.sourceThoughtId],
    foreignColumns: [table.id],
    name: 'Thought_sourceThoughtId_fkey',
  }).onUpdate('cascade').onDelete('set null'),
  foreignKey({
    columns: [table.clusterId],
    foreignColumns: [thoughtClusters.id],
    name: 'Thought_clusterId_fkey',
  }).onUpdate('cascade').onDelete('set null'),
]);

// Backwards compat alias
export const notes = thoughts;

// =============================================================================
// THOUGHT ATTACHMENTS (Images attached to thoughts)
// =============================================================================

export const thoughtAttachments = pgTable('ThoughtAttachment', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  storagePath: text('storage_path').notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  order: integer().default(0).notNull(),
  thoughtId: text('thought_id').notNull(),
  userId: text('user_id').notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('ThoughtAttachment_thoughtId_idx').using('btree', table.thoughtId.asc().nullsLast()),
  index('ThoughtAttachment_userId_idx').using('btree', table.userId.asc().nullsLast()),
  foreignKey({
    columns: [table.thoughtId],
    foreignColumns: [thoughts.id],
    name: 'ThoughtAttachment_thoughtId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'ThoughtAttachment_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// Backwards compat alias
export const noteAttachments = thoughtAttachments;

// =============================================================================
// THOUGHT CONNECTIONS
// =============================================================================
export const thoughtConnections = pgTable('ThoughtConnection', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  thoughtAId: text('thought_a_id').notNull(),
  thoughtBId: text('thought_b_id').notNull(),
  connectionType: text('connection_type').notNull(),
  strength: doublePrecision().default(0).notNull(),
  createdBy: text('created_by').notNull(),
  surfacedAt: timestamp('surfaced_at', { precision: 3, mode: 'date' }),
  userAction: text('user_action'),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('ThoughtConnection_thoughtAId_idx').using('btree', table.thoughtAId.asc()),
  index('ThoughtConnection_thoughtBId_idx').using('btree', table.thoughtBId.asc()),
  foreignKey({ columns: [table.thoughtAId], foreignColumns: [thoughts.id], name: 'ThoughtConnection_thoughtAId_fkey' }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({ columns: [table.thoughtBId], foreignColumns: [thoughts.id], name: 'ThoughtConnection_thoughtBId_fkey' }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// USER LABELS
// =============================================================================

export const userLabels = pgTable('UserLabel', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  name: text().notNull(),
  color: text().notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('UserLabel_userId_idx').using('btree', table.userId.asc()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'UserLabel_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

export const userLabelsRelations = relations(userLabels, ({ one }) => ({
  user: one(users, { fields: [userLabels.userId], references: [users.id] }),
}));

// =============================================================================
// THOUGHT EVENTS (Activity Log)
// =============================================================================
export const thoughtEvents = pgTable('ThoughtEvent', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  thoughtId: text('thought_id').notNull(),
  eventType: text('event_type').notNull(),
  metadata: jsonb().default({}),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('ThoughtEvent_thoughtId_idx').using('btree', table.thoughtId.asc(), table.createdAt.desc()),
  foreignKey({ columns: [table.thoughtId], foreignColumns: [thoughts.id], name: 'ThoughtEvent_thoughtId_fkey' }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// THOUGHT COMMENTS
// =============================================================================
export const thoughtComments = pgTable('ThoughtComment', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  thoughtId: text('thought_id').notNull(),
  userId: text('user_id').notNull(),
  content: text().notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('ThoughtComment_thoughtId_idx').using('btree', table.thoughtId.asc(), table.createdAt.asc()),
  foreignKey({ columns: [table.thoughtId], foreignColumns: [thoughts.id], name: 'ThoughtComment_thoughtId_fkey' }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({ columns: [table.userId], foreignColumns: [users.id], name: 'ThoughtComment_userId_fkey' }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// CRYSTALLIZED IDEAS
// =============================================================================
export const crystallizedIdeas = pgTable('CrystallizedIdea', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  clusterId: text('cluster_id'),
  projectId: text('project_id').notNull(),
  problemStatement: text('problem_statement'),
  targetAudience: text('target_audience'),
  proposedSolution: text('proposed_solution'),
  uniqueAngle: text('unique_angle'),
  pricingHypothesis: text('pricing_hypothesis'),
  sparkAnswers: jsonb('spark_answers'),
  sparkSessionId: text('spark_session_id'),
  sourceThoughtIds: text('source_thought_ids').array().default([]),
  crystallizedAt: timestamp('crystallized_at', { precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  crystallizedBy: text('crystallized_by').notNull(),
}, (table) => [
  index('CrystallizedIdea_userId_idx').using('btree', table.userId.asc()),
  foreignKey({ columns: [table.userId], foreignColumns: [users.id], name: 'CrystallizedIdea_userId_fkey' }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({ columns: [table.clusterId], foreignColumns: [thoughtClusters.id], name: 'CrystallizedIdea_clusterId_fkey' }).onUpdate('cascade').onDelete('set null'),
  foreignKey({ columns: [table.projectId], foreignColumns: [projects.id], name: 'CrystallizedIdea_projectId_fkey' }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// INTERVIEW
// =============================================================================

export const interviews = pgTable('Interview', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  mode: interviewModeEnum().default('LIGHT').notNull(),
  status: interviewStatusEnum().default('IN_PROGRESS').notNull(),
  currentTurn: integer().default(0).notNull(),
  maxTurns: integer().default(5).notNull(),
  messages: jsonb().notNull(),
  collectedData: jsonb(),
  confidenceScore: integer().default(0).notNull(),
  summary: text(),
  lastActiveAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  lastMessageAt: timestamp({ precision: 3, mode: 'date' }),
  resumeContext: text(),
  isExpired: boolean().default(false).notNull(),
  researchEngine: text('research_engine').default('OPENAI').notNull(),
  // Expand Mode interview progress tracking
  expandTrackProgress: jsonb('expand_track_progress'),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
  projectId: text().notNull(),
  userId: text().notNull(),
}, (table) => [
  index('Interview_lastActiveAt_idx').using('btree', table.lastActiveAt.asc().nullsLast()),
  index('Interview_mode_idx').using('btree', table.mode.asc().nullsLast()),
  index('Interview_projectId_idx').using('btree', table.projectId.asc().nullsLast()),
  index('Interview_projectId_status_idx').using('btree', table.projectId.asc(), table.status.asc()),
  index('Interview_status_idx').using('btree', table.status.asc().nullsLast()),
  index('Interview_userId_idx').using('btree', table.userId.asc().nullsLast()),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [projects.id],
    name: 'Interview_projectId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'Interview_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// RESEARCH
// =============================================================================

export const research = pgTable('Research', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  status: researchStatusEnum().default('PENDING').notNull(),
  currentPhase: researchPhaseEnum().default('QUEUED').notNull(),
  progress: integer().default(0).notNull(),
  estimatedCompletion: timestamp({ precision: 3, mode: 'date' }),
  startedAt: timestamp({ precision: 3, mode: 'date' }),
  completedAt: timestamp({ precision: 3, mode: 'date' }),
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
  swot: jsonb(),
  businessPlan: text(),
  businessPlanStatus: text('business_plan_status'),  // 'GENERATING' | 'COMPLETE' | 'FAILED' | null (not started)
  businessPlanError: text('business_plan_error'),
  businessPlanSubStatus: text('business_plan_sub_status'),  // 'LOADING_DATA' | 'SUMMARIZING' | 'WRITING' | 'SAVING' | null
  businessPlanCoverStyle: text('business_plan_cover_style').default('1'),  // '1' | '2' | '3' | '4'
  positioningCoverStyle: text('positioning_cover_style').default('1'),  // '1' | '2' | '3' | '4'
  sparkStatus: sparkJobStatusEnum(),
  sparkKeywords: jsonb(),
  sparkResult: jsonb(),
  sparkStartedAt: timestamp({ precision: 3, mode: 'date' }),
  sparkCompletedAt: timestamp({ precision: 3, mode: 'date' }),
  sparkError: text(),
  researchEngine: text('research_engine').default('OPENAI').notNull(),
  errorMessage: text(),
  errorPhase: researchPhaseEnum(),
  retryCount: integer().default(0).notNull(),
  notesSnapshot: text(),
  // Expand Mode research outputs
  expandResearchData: jsonb('expand_research_data'),
  expandOpportunityEngine: jsonb('expand_opportunity_engine'),
  expandMoatAudit: jsonb('expand_moat_audit'),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
  projectId: text().notNull(),
}, (table) => [
  index('Research_currentPhase_idx').using('btree', table.currentPhase.asc().nullsLast()),
  uniqueIndex('Research_projectId_key').using('btree', table.projectId.asc().nullsLast()),
  index('Research_status_idx').using('btree', table.status.asc().nullsLast()),
  index('Research_status_currentPhase_idx').using('btree', table.status.asc(), table.currentPhase.asc()),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [projects.id],
    name: 'Research_projectId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// REPORT
// =============================================================================

export const reports = pgTable('Report', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  type: reportTypeEnum().notNull(),
  tier: reportTierEnum().notNull(),
  title: text().notNull(),
  content: text().notNull(),
  sections: jsonb().notNull(),
  version: integer().default(1).notNull(),
  status: reportStatusEnum().default('DRAFT').notNull(),
  pdfUrl: text(),
  citations: jsonb(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
  projectId: text().notNull(),
  userId: text().notNull(),
}, (table) => [
  index('Report_projectId_idx').using('btree', table.projectId.asc().nullsLast()),
  index('Report_projectId_type_idx').using('btree', table.projectId.asc(), table.type.asc()),
  index('Report_status_idx').using('btree', table.status.asc().nullsLast()),
  index('Report_tier_idx').using('btree', table.tier.asc().nullsLast()),
  index('Report_type_idx').using('btree', table.type.asc().nullsLast()),
  index('Report_userId_idx').using('btree', table.userId.asc().nullsLast()),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [projects.id],
    name: 'Report_projectId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'Report_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// ADMIN CONFIG
// =============================================================================

export const adminConfigs = pgTable('AdminConfig', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  key: text().notNull(),
  value: jsonb().notNull(),
  type: configTypeEnum().default('STRING').notNull(),
  category: text().notNull(),
  label: text().notNull(),
  description: text(),
  options: jsonb(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
  updatedBy: text(),
}, (table) => [
  index('AdminConfig_category_idx').using('btree', table.category.asc().nullsLast()),
  uniqueIndex('AdminConfig_key_key').using('btree', table.key.asc().nullsLast()),
]);

export const configAuditLogs = pgTable('ConfigAuditLog', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  configKey: text().notNull(),
  oldValue: jsonb(),
  newValue: jsonb().notNull(),
  changedBy: text().notNull(),
  changedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  reason: text(),
}, (table) => [
  index('ConfigAuditLog_changedAt_idx').using('btree', table.changedAt.asc().nullsLast()),
  index('ConfigAuditLog_configKey_idx').using('btree', table.configKey.asc().nullsLast()),
]);

// =============================================================================
// CREDIT TRANSACTIONS (pay-as-you-go credit ledger)
// =============================================================================

export const creditTransactions = pgTable('CreditTransaction', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  amount: integer().notNull(),
  type: creditTransactionTypeEnum().notNull(),
  operation: text(),
  relatedEntityId: text('related_entity_id'),
  stripeSessionId: text('stripe_session_id'),
  balanceAfter: integer('balance_after').notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('CreditTransaction_createdAt_idx').using('btree', table.createdAt.desc().nullsLast()),
  index('CreditTransaction_stripeSessionId_idx').using('btree', table.stripeSessionId),
  index('CreditTransaction_userId_idx').using('btree', table.userId),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'CreditTransaction_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// TOKEN USAGE TRACKING
// =============================================================================

export const tokenUsages = pgTable('TokenUsage', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  userId: text(),
  projectId: text(),
  functionName: text().notNull(),
  model: text().notNull(),
  inputTokens: integer().notNull(),
  outputTokens: integer().notNull(),
  totalTokens: integer().notNull(),
  cachedTokens: integer().default(0).notNull(),
  costEstimate: doublePrecision(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('TokenUsage_createdAt_idx').using('btree', table.createdAt.asc().nullsLast()),
  index('TokenUsage_functionName_idx').using('btree', table.functionName.asc().nullsLast()),
  index('TokenUsage_model_idx').using('btree', table.model.asc().nullsLast()),
  index('TokenUsage_userId_idx').using('btree', table.userId.asc().nullsLast()),
]);

// =============================================================================
// AUDIT LOGGING
// =============================================================================

export const auditLogs = pgTable('AuditLog', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  userId: text().notNull(),
  action: text().notNull(),
  resource: text().notNull(),
  metadata: jsonb(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('AuditLog_action_idx').using('btree', table.action.asc().nullsLast()),
  index('AuditLog_createdAt_idx').using('btree', table.createdAt.asc().nullsLast()),
  index('AuditLog_userId_idx').using('btree', table.userId.asc().nullsLast()),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'AuditLog_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// BLOG
// =============================================================================

export const blogPosts = pgTable('BlogPost', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  slug: text().notNull(),
  title: text().notNull(),
  description: text(),
  content: jsonb().notNull(),
  coverImage: text(),
  status: blogPostStatusEnum().default('DRAFT').notNull(),
  publishedAt: timestamp({ precision: 3, mode: 'date' }),
  readingTime: text(),
  wordCount: integer().default(0).notNull(),
  tags: text().array().default(sql`'{}'::text[]`).notNull(),
  authorId: text(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('BlogPost_authorId_idx').using('btree', table.authorId.asc().nullsLast()),
  index('BlogPost_publishedAt_idx').using('btree', table.publishedAt.asc().nullsLast()),
  uniqueIndex('BlogPost_slug_key').using('btree', table.slug.asc().nullsLast()),
  index('BlogPost_status_idx').using('btree', table.status.asc().nullsLast()),
  foreignKey({
    columns: [table.authorId],
    foreignColumns: [users.id],
    name: 'BlogPost_authorId_fkey',
  }).onUpdate('cascade').onDelete('set null'),
]);

// =============================================================================
// DAILY TREND PICK
// =============================================================================

export const dailyRuns = pgTable('DailyRun', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  dateLocal: text().notNull(),
  startedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
  finishedAt: timestamp({ precision: 3, mode: 'date' }),
  status: dailyRunStatusEnum().notNull(),
  metrics: jsonb(),
  logsRef: text(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('DailyRun_dateLocal_idx').using('btree', table.dateLocal.asc().nullsLast()),
  index('DailyRun_status_idx').using('btree', table.status.asc().nullsLast()),
]);

export const queryCandidates = pgTable('QueryCandidate', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  runId: text().notNull(),
  query: text().notNull(),
  normalizedQuery: text().notNull(),
  source: text().notNull(),
  discoveredAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
  filterPassed: boolean().default(false).notNull(),
  filterPassReason: text(),
  matchedPatterns: jsonb(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('QueryCandidate_filterPassed_idx').using('btree', table.filterPassed.asc().nullsLast()),
  index('QueryCandidate_normalizedQuery_idx').using('btree', table.normalizedQuery.asc().nullsLast()),
  index('QueryCandidate_runId_idx').using('btree', table.runId.asc().nullsLast()),
  foreignKey({
    columns: [table.runId],
    foreignColumns: [dailyRuns.id],
    name: 'QueryCandidate_runId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

export const trendSeries = pgTable('TrendSeries', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  query: text().notNull(),
  geo: text().notNull(),
  timeframe: text().notNull(),
  points: jsonb().notNull(),
  fetchedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('TrendSeries_fetchedAt_idx').using('btree', table.fetchedAt.asc().nullsLast()),
  index('TrendSeries_query_geo_timeframe_idx').using('btree', table.query.asc().nullsLast(), table.geo.asc().nullsLast(), table.timeframe.asc().nullsLast()),
]);

export const serpSnapshots = pgTable('SerpSnapshot', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  query: text().notNull(),
  geo: text().notNull(),
  device: text().default('desktop').notNull(),
  adsCount: integer().notNull(),
  shoppingPresent: boolean().notNull(),
  topStoriesPresent: boolean().notNull(),
  topDomains: jsonb().notNull(),
  snippetsSample: jsonb().notNull(),
  rawFeatures: jsonb(),
  fetchedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('SerpSnapshot_fetchedAt_idx').using('btree', table.fetchedAt.asc().nullsLast()),
  index('SerpSnapshot_query_geo_idx').using('btree', table.query.asc().nullsLast(), table.geo.asc().nullsLast()),
]);

export const clusters = pgTable('Cluster', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
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
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('Cluster_canonicalQuery_idx').using('btree', table.canonicalQuery.asc().nullsLast()),
  index('Cluster_combinedScore_idx').using('btree', table.combinedScore.asc().nullsLast()),
  index('Cluster_runId_idx').using('btree', table.runId.asc().nullsLast()),
  foreignKey({
    columns: [table.runId],
    foreignColumns: [dailyRuns.id],
    name: 'Cluster_runId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

export const aiClassifications = pgTable('AIClassification', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  targetType: aiClassificationTargetTypeEnum().notNull(),
  targetId: text().notNull(),
  model: text().notNull(),
  schemaVersion: text().notNull(),
  payloadHash: text().notNull(),
  outputJson: jsonb().notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('AIClassification_payloadHash_idx').using('btree', table.payloadHash.asc().nullsLast()),
  index('AIClassification_targetType_targetId_idx').using('btree', table.targetType.asc().nullsLast(), table.targetId.asc().nullsLast()),
]);

export const dailyPicks = pgTable('DailyPick', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  dateLocal: text().notNull(),
  winnerClusterId: text().notNull(),
  revision: integer().default(1).notNull(),
  status: dailyPickStatusEnum().default('ACTIVE').notNull(),
  publishedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('DailyPick_dateLocal_idx').using('btree', table.dateLocal.asc().nullsLast()),
  index('DailyPick_status_idx').using('btree', table.status.asc().nullsLast()),
  foreignKey({
    columns: [table.winnerClusterId],
    foreignColumns: [clusters.id],
    name: 'DailyPick_winnerClusterId_fkey',
  }).onUpdate('cascade').onDelete('restrict'),
]);

// =============================================================================
// ADMIN SECURITY
// =============================================================================

export const adminIPWhitelists = pgTable('AdminIPWhitelist', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  ipAddress: text().notNull(),
  label: text(),
  addedBy: text().notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: timestamp({ precision: 3, mode: 'date' }),
}, (table) => [
  index('AdminIPWhitelist_ipAddress_idx').using('btree', table.ipAddress.asc().nullsLast()),
  uniqueIndex('AdminIPWhitelist_ipAddress_key').using('btree', table.ipAddress.asc().nullsLast()),
]);

// =============================================================================
// EMAIL CAPTURE
// =============================================================================

export const emailCaptures = pgTable('EmailCapture', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  email: text().notNull(),
  source: text().default('landing').notNull(),
  beehiivSynced: boolean().default(false).notNull(),
  metadata: jsonb(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('EmailCapture_beehiivSynced_idx').using('btree', table.beehiivSynced.asc().nullsLast()),
  index('EmailCapture_email_idx').using('btree', table.email.asc().nullsLast()),
  uniqueIndex('EmailCapture_email_key').using('btree', table.email.asc().nullsLast()),
  index('EmailCapture_source_idx').using('btree', table.source.asc().nullsLast()),
]);

// =============================================================================
// AGENT CONVERSATION — one per project per user
// =============================================================================

export const agentConversations = pgTable('AgentConversation', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  projectId: text().notNull(),
  userId: text().notNull(),
  status: agentConversationStatusEnum().default('ACTIVE').notNull(),
  messages: jsonb().notNull().$type<AgentMessageRow[]>().default([]),
  summary: text(),
  messageCount: integer().default(0).notNull(),
  totalTokensUsed: integer().default(0).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('AgentConversation_projectId_idx').on(table.projectId),
  index('AgentConversation_userId_idx').on(table.userId),
  unique('AgentConversation_projectId_userId_key').on(table.projectId, table.userId),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [projects.id],
    name: 'AgentConversation_projectId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'AgentConversation_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// Type for the JSONB messages array rows
export interface AgentMessageRow {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: Array<{ id: string; name: string; args: Record<string, unknown> }>;
  toolResults?: Array<{ toolCallId: string; result: unknown; isError?: boolean }>;
  tokenCount?: number;
  timestamp: string;
}

// =============================================================================
// AGENT INSIGHT — content blocks added to reports
// =============================================================================

export const agentInsights = pgTable('AgentInsight', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  projectId: text().notNull(),
  userId: text().notNull(),
  reportId: text(),
  conversationId: text().notNull(),
  title: text().notNull(),
  content: text().notNull(),
  prompt: text().notNull(),
  order: integer().default(0).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('AgentInsight_projectId_idx').on(table.projectId),
  index('AgentInsight_userId_idx').on(table.userId),
  index('AgentInsight_reportId_idx').on(table.reportId),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [projects.id],
    name: 'AgentInsight_projectId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'AgentInsight_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.reportId],
    foreignColumns: [reports.id],
    name: 'AgentInsight_reportId_fkey',
  }).onUpdate('cascade').onDelete('set null'),
  foreignKey({
    columns: [table.conversationId],
    foreignColumns: [agentConversations.id],
    name: 'AgentInsight_conversationId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// AGENT MESSAGE — normalized conversation messages (replaces JSONB array)
// =============================================================================

export const agentMessages = pgTable('AgentMessage', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  conversationId: text().notNull(),
  role: text().$type<'user' | 'assistant' | 'tool'>().notNull(),
  content: text().notNull(),
  toolCalls: jsonb().$type<Array<{ id: string; name: string; args: Record<string, unknown> }>>(),
  toolResults: jsonb().$type<Array<{ toolCallId: string; result: unknown; isError?: boolean }>>(),
  tokenCount: integer(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('AgentMessage_conversationId_idx').on(table.conversationId),
  index('AgentMessage_conversationId_createdAt_idx').on(table.conversationId, table.createdAt),
  foreignKey({
    columns: [table.conversationId],
    foreignColumns: [agentConversations.id],
    name: 'AgentMessage_conversationId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// EMBEDDING — pgvector chunks of project data for RAG
// =============================================================================

export const embeddings = pgTable('Embedding', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  projectId: text(),
  userId: text('user_id'),
  sourceType: embeddingSourceTypeEnum().notNull(),
  sourceId: text().notNull(),
  chunkIndex: integer().default(0).notNull(),
  content: text().notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  metadata: jsonb().$type<Record<string, unknown>>(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('Embedding_projectId_idx').on(table.projectId),
  index('Embedding_userId_idx').on(table.userId),
  index('Embedding_source_idx').on(table.sourceType, table.sourceId),
  unique('Embedding_source_chunk_key').on(table.sourceType, table.sourceId, table.chunkIndex),
  index('Embedding_vector_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [projects.id],
    name: 'Embedding_projectId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'Embedding_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// ASSUMPTIONS ENGINE
// =============================================================================

export const assumptions = pgTable('Assumption', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  projectId: text(),
  scenarioId: text(),
  parentId: text(),
  aggregationMode: assumptionAggregationEnum().default('SUM'),
  moduleKey: text(),
  category: assumptionCategoryEnum().notNull(),
  name: text().notNull(),
  key: text().notNull(),
  value: text(),
  numericValue: numeric({ precision: 15, scale: 2 }),
  timeSeries: jsonb().$type<{ monthly?: number[]; quarterly?: number[]; annual?: number[] }>(),
  valueType: assumptionValueTypeEnum().notNull(),
  unit: text(),
  confidence: assumptionConfidenceEnum().default('AI_ESTIMATE').notNull(),
  source: text().default('System default').notNull(),
  sourceUrl: text(),
  formula: text(),
  dependsOn: text().array().default(sql`'{}'::text[]`),
  tier: assumptionTierEnum(),
  isSensitive: boolean().default(false).notNull(),
  isRequired: boolean().default(true).notNull(),
  displayOrder: integer().default(0).notNull(),
  updatedByActor: text().default('system').notNull(),
  updatedByUserId: text(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  unique('Assumption_scenarioId_key_key').on(table.scenarioId, table.key),
  index('Assumption_projectId_idx').on(table.projectId),
  index('Assumption_projectId_category_idx').on(table.projectId, table.category),
  index('Assumption_scenarioId_idx').on(table.scenarioId),
  index('Assumption_scenarioId_category_idx').on(table.scenarioId, table.category),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [projects.id],
    name: 'Assumption_projectId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.scenarioId],
    foreignColumns: [scenarios.id],
    name: 'Assumption_scenarioId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  // Note: parentId self-reference handled via Drizzle relation (parentChild)
  // to avoid circular type inference. DB-level FK can be added via raw migration.
]);

export const assumptionHistory = pgTable('AssumptionHistory', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  assumptionId: text().notNull(),
  oldValue: text(),
  newValue: text(),
  oldConfidence: assumptionConfidenceEnum(),
  newConfidence: assumptionConfidenceEnum(),
  changedByActor: text().notNull(),
  changedByUserId: text(),
  reason: text(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('AssumptionHistory_assumptionId_idx').on(table.assumptionId),
  index('AssumptionHistory_createdAt_idx').on(table.createdAt),
  foreignKey({
    columns: [table.assumptionId],
    foreignColumns: [assumptions.id],
    name: 'AssumptionHistory_assumptionId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// FINANCIAL MODEL
// =============================================================================

export const financialModels = pgTable('FinancialModel', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  userId: text().notNull(),
  projectId: text(),
  templateId: text(),
  name: text().notNull(),
  knowledgeLevel: knowledgeLevelEnum().default('BEGINNER').notNull(),
  forecastYears: integer().default(5).notNull(),
  status: financialModelStatusEnum().default('DRAFT').notNull(),
  settings: jsonb().$type<Record<string, unknown>>().default({}),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('FinancialModel_userId_idx').on(table.userId),
  index('FinancialModel_projectId_idx').on(table.projectId),
  index('FinancialModel_status_idx').on(table.status),
  index('FinancialModel_userId_status_idx').on(table.userId, table.status),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'FinancialModel_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [projects.id],
    name: 'FinancialModel_projectId_fkey',
  }).onUpdate('cascade').onDelete('set null'),
]);

// =============================================================================
// SCENARIO
// =============================================================================

export const scenarios = pgTable('Scenario', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  modelId: text().notNull(),
  name: text().notNull(),
  isBase: boolean().default(false).notNull(),
  description: text(),
  displayOrder: integer().default(0).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('Scenario_modelId_idx').on(table.modelId),
  uniqueIndex('Scenario_modelId_isBase_key')
    .on(table.modelId, table.isBase)
    .where(sql`"isBase" = true`),
  foreignKey({
    columns: [table.modelId],
    foreignColumns: [financialModels.id],
    name: 'Scenario_modelId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// MODEL MODULE (which calculation modules are active per model)
// =============================================================================

export const modelModules = pgTable('ModelModule', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  modelId: text().notNull(),
  moduleKey: text().notNull(),
  isEnabled: boolean().default(true).notNull(),
  settings: jsonb().$type<Record<string, unknown>>(),
  displayOrder: integer().default(0).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  unique('ModelModule_modelId_moduleKey_key').on(table.modelId, table.moduleKey),
  index('ModelModule_modelId_idx').on(table.modelId),
  foreignKey({
    columns: [table.modelId],
    foreignColumns: [financialModels.id],
    name: 'ModelModule_modelId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// MODEL SNAPSHOT
// =============================================================================

export const modelSnapshots = pgTable('ModelSnapshot', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  modelId: text().notNull(),
  name: text().notNull(),
  assumptionData: jsonb().notNull(),
  computedOutputs: jsonb(),
  createdByAction: snapshotActionEnum().default('MANUAL').notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('ModelSnapshot_modelId_idx').on(table.modelId),
  index('ModelSnapshot_createdAt_idx').on(table.createdAt),
  index('ModelSnapshot_modelId_createdAt_idx').on(table.modelId, table.createdAt),
  foreignKey({
    columns: [table.modelId],
    foreignColumns: [financialModels.id],
    name: 'ModelSnapshot_modelId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// INDUSTRY TEMPLATE
// =============================================================================

export const industryTemplates = pgTable('IndustryTemplate', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  slug: text().notNull(),
  name: text().notNull(),
  description: text(),
  category: templateCategoryEnum().notNull(),
  defaultAssumptions: jsonb().notNull(),
  lineItems: jsonb().notNull(),
  wizardQuestions: jsonb(),
  displayOrder: integer().default(0).notNull(),
  isActive: boolean().default(true).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('IndustryTemplate_slug_key').on(table.slug),
  index('IndustryTemplate_category_idx').on(table.category),
  index('IndustryTemplate_isActive_idx').on(table.isActive),
]);

// =============================================================================
// ERP CONNECTION
// =============================================================================

export const erpConnections = pgTable('ERPConnection', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  userId: text().notNull(),
  provider: erpProviderEnum().notNull(),
  encryptedAccessToken: text().notNull(),
  encryptedRefreshToken: text(),
  realmId: text(),
  tenantId: text(),
  companyName: text(),
  status: erpConnectionStatusEnum().default('ACTIVE').notNull(),
  tokenExpiresAt: timestamp({ precision: 3, mode: 'date' }),
  lastSyncAt: timestamp({ precision: 3, mode: 'date' }),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index('ERPConnection_userId_idx').on(table.userId),
  index('ERPConnection_status_idx').on(table.status),
  index('ERPConnection_userId_provider_idx').on(table.userId, table.provider),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'ERPConnection_userId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
]);

// =============================================================================
// BUDGET LINE ITEM
// =============================================================================

export const budgetLineItems = pgTable('BudgetLineItem', {
  id: text().primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  modelId: text().notNull(),
  erpConnectionId: text(),
  category: text().notNull(),
  accountName: text().notNull(),
  erpAccountId: text(),
  budgetValues: jsonb().$type<Record<string, number>>(),
  actualValues: jsonb().$type<Record<string, number>>(),
  lastSyncAt: timestamp({ precision: 3, mode: 'date' }),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$onUpdate(() => new Date()),
}, (table) => [
  index('BudgetLineItem_modelId_idx').on(table.modelId),
  index('BudgetLineItem_category_idx').on(table.category),
  index('BudgetLineItem_modelId_category_idx').on(table.modelId, table.category),
  foreignKey({
    columns: [table.modelId],
    foreignColumns: [financialModels.id],
    name: 'BudgetLineItem_modelId_fkey',
  }).onUpdate('cascade').onDelete('cascade'),
  foreignKey({
    columns: [table.erpConnectionId],
    foreignColumns: [erpConnections.id],
    name: 'BudgetLineItem_erpConnectionId_fkey',
  }).onUpdate('cascade').onDelete('set null'),
]);

// =============================================================================
// RELATIONS
// =============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  interviews: many(interviews),
  reports: many(reports),
  accounts: many(accounts),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
  blogPosts: many(blogPosts),
  agentConversations: many(agentConversations),
  agentInsights: many(agentInsights),
  financialModels: many(financialModels),
  erpConnections: many(erpConnections),
  notes: many(notes),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  interviews: many(interviews),
  reports: many(reports),
  research: one(research, { fields: [projects.id], references: [research.projectId] }),
  assumptions: many(assumptions),
  agentConversations: many(agentConversations),
  agentInsights: many(agentInsights),
  embeddings: many(embeddings),
  financialModels: many(financialModels),
  promotedNotes: many(thoughts),
  attachments: many(projectAttachments),
  customerInterviews: many(customerInterviews),
}));

export const thoughtsRelations = relations(thoughts, ({ one, many }) => ({
  user: one(users, { fields: [thoughts.userId], references: [users.id] }),
  promotedProject: one(projects, { fields: [thoughts.promotedProjectId], references: [projects.id] }),
  cluster: one(thoughtClusters, { fields: [thoughts.clusterId], references: [thoughtClusters.id] }),
  sourceThought: one(thoughts, { fields: [thoughts.sourceThoughtId], references: [thoughts.id], relationName: 'sourceThought' }),
  attachments: many(thoughtAttachments),
  events: many(thoughtEvents),
  comments: many(thoughtComments),
}));
// Keep old name for compat
export const notesRelations = thoughtsRelations;

export const thoughtClustersRelations = relations(thoughtClusters, ({ one, many }) => ({
  user: one(users, { fields: [thoughtClusters.userId], references: [users.id] }),
  thoughts: many(thoughts),
  crystallizedIdeas: many(crystallizedIdeas),
}));
// Keep old name for compat
export const sandboxesRelations = thoughtClustersRelations;

export const thoughtAttachmentsRelations = relations(thoughtAttachments, ({ one }) => ({
  thought: one(thoughts, { fields: [thoughtAttachments.thoughtId], references: [thoughts.id] }),
  user: one(users, { fields: [thoughtAttachments.userId], references: [users.id] }),
}));

export const thoughtConnectionsRelations = relations(thoughtConnections, ({ one }) => ({
  thoughtA: one(thoughts, { fields: [thoughtConnections.thoughtAId], references: [thoughts.id], relationName: 'connectionsA' }),
  thoughtB: one(thoughts, { fields: [thoughtConnections.thoughtBId], references: [thoughts.id], relationName: 'connectionsB' }),
}));

export const thoughtEventsRelations = relations(thoughtEvents, ({ one }) => ({
  thought: one(thoughts, { fields: [thoughtEvents.thoughtId], references: [thoughts.id] }),
}));

export const thoughtCommentsRelations = relations(thoughtComments, ({ one }) => ({
  thought: one(thoughts, { fields: [thoughtComments.thoughtId], references: [thoughts.id] }),
  user: one(users, { fields: [thoughtComments.userId], references: [users.id] }),
}));

export const crystallizedIdeasRelations = relations(crystallizedIdeas, ({ one }) => ({
  user: one(users, { fields: [crystallizedIdeas.userId], references: [users.id] }),
  cluster: one(thoughtClusters, { fields: [crystallizedIdeas.clusterId], references: [thoughtClusters.id] }),
  project: one(projects, { fields: [crystallizedIdeas.projectId], references: [projects.id] }),
}));

export const interviewsRelations = relations(interviews, ({ one }) => ({
  project: one(projects, { fields: [interviews.projectId], references: [projects.id] }),
  user: one(users, { fields: [interviews.userId], references: [users.id] }),
}));

export const researchRelations = relations(research, ({ one }) => ({
  project: one(projects, { fields: [research.projectId], references: [projects.id] }),
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
  project: one(projects, { fields: [reports.projectId], references: [projects.id] }),
  user: one(users, { fields: [reports.userId], references: [users.id] }),
  agentInsights: many(agentInsights),
}));

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  author: one(users, { fields: [blogPosts.authorId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const dailyRunsRelations = relations(dailyRuns, ({ many }) => ({
  candidates: many(queryCandidates),
  clusters: many(clusters),
}));

export const queryCandidatesRelations = relations(queryCandidates, ({ one }) => ({
  run: one(dailyRuns, { fields: [queryCandidates.runId], references: [dailyRuns.id] }),
}));

export const clustersRelations = relations(clusters, ({ one, many }) => ({
  run: one(dailyRuns, { fields: [clusters.runId], references: [dailyRuns.id] }),
  dailyPicks: many(dailyPicks),
}));

export const dailyPicksRelations = relations(dailyPicks, ({ one }) => ({
  winnerCluster: one(clusters, { fields: [dailyPicks.winnerClusterId], references: [clusters.id] }),
}));

export const agentConversationsRelations = relations(agentConversations, ({ one, many }) => ({
  project: one(projects, { fields: [agentConversations.projectId], references: [projects.id] }),
  user: one(users, { fields: [agentConversations.userId], references: [users.id] }),
  agentInsights: many(agentInsights),
  agentMessages: many(agentMessages),
}));

export const agentInsightsRelations = relations(agentInsights, ({ one }) => ({
  project: one(projects, { fields: [agentInsights.projectId], references: [projects.id] }),
  user: one(users, { fields: [agentInsights.userId], references: [users.id] }),
  report: one(reports, { fields: [agentInsights.reportId], references: [reports.id] }),
  conversation: one(agentConversations, { fields: [agentInsights.conversationId], references: [agentConversations.id] }),
}));

export const agentMessagesRelations = relations(agentMessages, ({ one }) => ({
  conversation: one(agentConversations, { fields: [agentMessages.conversationId], references: [agentConversations.id] }),
}));

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  project: one(projects, { fields: [embeddings.projectId], references: [projects.id] }),
  user: one(users, { fields: [embeddings.userId], references: [users.id] }),
}));

export const assumptionsRelations = relations(assumptions, ({ one, many }) => ({
  project: one(projects, { fields: [assumptions.projectId], references: [projects.id] }),
  scenario: one(scenarios, { fields: [assumptions.scenarioId], references: [scenarios.id] }),
  parent: one(assumptions, { fields: [assumptions.parentId], references: [assumptions.id], relationName: 'parentChild' }),
  children: many(assumptions, { relationName: 'parentChild' }),
  history: many(assumptionHistory),
}));

export const assumptionHistoryRelations = relations(assumptionHistory, ({ one }) => ({
  assumption: one(assumptions, { fields: [assumptionHistory.assumptionId], references: [assumptions.id] }),
}));

// Financial Model relations
export const financialModelsRelations = relations(financialModels, ({ one, many }) => ({
  user: one(users, { fields: [financialModels.userId], references: [users.id] }),
  project: one(projects, { fields: [financialModels.projectId], references: [projects.id] }),
  template: one(industryTemplates, { fields: [financialModels.templateId], references: [industryTemplates.id] }),
  scenarios: many(scenarios),
  snapshots: many(modelSnapshots),
  modules: many(modelModules),
  budgetLineItems: many(budgetLineItems),
}));

export const scenariosRelations = relations(scenarios, ({ one, many }) => ({
  model: one(financialModels, { fields: [scenarios.modelId], references: [financialModels.id] }),
  assumptions: many(assumptions),
}));

export const modelModulesRelations = relations(modelModules, ({ one }) => ({
  model: one(financialModels, { fields: [modelModules.modelId], references: [financialModels.id] }),
}));

export const modelSnapshotsRelations = relations(modelSnapshots, ({ one }) => ({
  model: one(financialModels, { fields: [modelSnapshots.modelId], references: [financialModels.id] }),
}));

export const industryTemplatesRelations = relations(industryTemplates, ({ many }) => ({
  financialModels: many(financialModels),
}));

export const erpConnectionsRelations = relations(erpConnections, ({ one, many }) => ({
  user: one(users, { fields: [erpConnections.userId], references: [users.id] }),
  budgetLineItems: many(budgetLineItems),
}));

export const budgetLineItemsRelations = relations(budgetLineItems, ({ one }) => ({
  model: one(financialModels, { fields: [budgetLineItems.modelId], references: [financialModels.id] }),
  erpConnection: one(erpConnections, { fields: [budgetLineItems.erpConnectionId], references: [erpConnections.id] }),
}));

// =============================================================================
// CUSTOMER INTERVIEW (re-exports from customer-interview-schema.ts)
// =============================================================================

export {
  customerInterviewGatingEnum,
  customerInterviewStatusEnum,
  questionTypeEnum,
  customerInterviews,
  interviewResponses,
  ndaSignatures,
} from './customer-interview-schema';

export const customerInterviewsRelations = relations(customerInterviews, ({ one, many }) => ({
  project: one(projects, { fields: [customerInterviews.projectId], references: [projects.id] }),
  user: one(users, { fields: [customerInterviews.userId], references: [users.id] }),
  responses: many(interviewResponses),
  ndaSignatures: many(ndaSignatures),
}));

export const interviewResponsesRelations = relations(interviewResponses, ({ one }) => ({
  customerInterview: one(customerInterviews, { fields: [interviewResponses.customerInterviewId], references: [customerInterviews.id] }),
}));

export const ndaSignaturesRelations = relations(ndaSignatures, ({ one }) => ({
  customerInterview: one(customerInterviews, { fields: [ndaSignatures.customerInterviewId], references: [customerInterviews.id] }),
  response: one(interviewResponses, { fields: [ndaSignatures.interviewResponseId], references: [interviewResponses.id] }),
}));
