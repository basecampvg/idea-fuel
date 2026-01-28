import { Prisma } from '@prisma/client';
import { prisma } from '../db';

/**
 * Audit action types for tracking user activity.
 * Used for access control, compliance, and analytics.
 */
export type AuditAction =
  // Idea lifecycle
  | 'IDEA_CREATE'
  | 'IDEA_UPDATE'
  | 'IDEA_DELETE'
  | 'IDEA_VIEW'
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
  // User settings
  | 'SETTINGS_UPDATE'
  | 'SUBSCRIPTION_CHANGE';

export interface AuditLogParams {
  userId: string;
  action: AuditAction;
  resource: string; // Format: "type:id" e.g., "idea:abc123"
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event for a user action.
 * Fire-and-forget by default to avoid blocking the main request.
 *
 * @example
 * await logAudit({
 *   userId: ctx.session.user.id,
 *   action: 'IDEA_CREATE',
 *   resource: `idea:${idea.id}`,
 *   metadata: { title: idea.title },
 * });
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
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
export function formatResource(type: 'idea' | 'interview' | 'report' | 'research' | 'user', id: string): string {
  return `${type}:${id}`;
}
