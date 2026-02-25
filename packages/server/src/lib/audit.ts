import { db } from '../db/drizzle';
import { auditLogs } from '../db/schema';

/**
 * Audit action types for tracking user activity.
 * Used for access control, compliance, and analytics.
 */
export type AuditAction =
  // Project lifecycle
  | 'PROJECT_CREATE'
  | 'PROJECT_UPDATE'
  | 'PROJECT_DELETE'
  | 'PROJECT_VIEW'
  // Interview lifecycle
  | 'INTERVIEW_START'
  | 'INTERVIEW_RESUME'
  | 'INTERVIEW_COMPLETE'
  | 'INTERVIEW_ABANDON'
  // Research lifecycle
  | 'RESEARCH_START'
  | 'RESEARCH_COMPLETE'
  | 'RESEARCH_CANCEL'
  // Report access
  | 'REPORT_VIEW'
  | 'REPORT_DOWNLOAD'
  | 'REPORT_GENERATE'
  // Financial model lifecycle
  | 'FINANCIAL_MODEL_CREATE'
  | 'FINANCIAL_MODEL_UPDATE'
  | 'FINANCIAL_MODEL_DELETE'
  // Scenario lifecycle
  | 'SCENARIO_CREATE'
  | 'SCENARIO_UPDATE'
  | 'SCENARIO_DELETE'
  // Snapshot lifecycle
  | 'SNAPSHOT_CREATE'
  | 'SNAPSHOT_RESTORE'
  // Export lifecycle
  | 'EXPORT_EXCEL'
  | 'EXPORT_PDF'
  // User settings
  | 'SETTINGS_UPDATE'
  | 'SUBSCRIPTION_CHANGE';

export interface AuditLogParams {
  userId: string;
  action: AuditAction;
  resource: string; // Format: "type:id" e.g., "project:abc123"
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event for a user action.
 * Fire-and-forget by default to avoid blocking the main request.
 *
 * @example
 * await logAudit({
 *   userId: ctx.session.user.id,
 *   action: 'PROJECT_CREATE',
 *   resource: `project:${project.id}`,
 *   metadata: { title: project.title },
 * });
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      metadata: params.metadata ?? null,
    });
  } catch (error) {
    // Log but don't throw - audit logging should not break the main flow
    console.error('[AuditLog] Failed to create audit log:', error);
  }
}

/**
 * Log an audit event without awaiting (fire-and-forget).
 * Use when you don't need to wait for the log to complete.
 */
export function logAuditAsync(params: AuditLogParams): void {
  logAudit(params).catch(() => {
    // Error already logged in logAudit
  });
}

/**
 * Helper to create a resource string from type and ID.
 */
export function formatResource(type: 'project' | 'interview' | 'report' | 'research' | 'user' | 'financial_model' | 'scenario' | 'snapshot', id: string): string {
  return `${type}:${id}`;
}
