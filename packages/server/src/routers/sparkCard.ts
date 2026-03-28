/**
 * SparkCard Router — Mobile quick validation card endpoints
 *
 * Procedures:
 * - chat: Returns the next question based on turn number (3 fixed questions)
 * - validate: Eligibility check → consume card → research → extract → save
 * - promote: Marks a project as promoted and returns a web URL
 */

import { eq, and, sql, gt } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import {
  chatCardSchema,
  validateCardSchema,
  promoteCardSchema,
} from '@forge/shared';
import type { CardResult } from '@forge/shared';
import { users, projects } from '../db/schema';
import { db } from '../db/drizzle';
import { sonarProResearch } from '../providers/perplexity/sonar-pro';
import { CARD_CHAT_QUESTIONS, buildResearchBrief, extractCardResult, generateSuggestions } from '../services/card-ai';

// ============================================================================
// Router
// ============================================================================

export const sparkCardRouter = router({
  /**
   * Chat procedure — returns the next question based on turn number.
   * Turn 0-2: return the corresponding question.
   * Turn 3: return { complete: true } signaling the chat is done.
   */
  chat: protectedProcedure
    .input(chatCardSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId, turn } = input;

      if (turn >= 0 && turn < CARD_CHAT_QUESTIONS.length) {
        const question = CARD_CHAT_QUESTIONS[turn];

        // Generate smart suggestions based on the project idea (non-blocking)
        let suggestions: string[] = [];
        try {
          const project = await ctx.db.query.projects.findFirst({
            where: and(eq(projects.id, projectId), eq(projects.userId, ctx.userId)),
            columns: { title: true, description: true },
          });

          if (project) {
            suggestions = await generateSuggestions(
              project.title,
              project.description,
              question,
              turn
            );
          }
        } catch {
          // Suggestions are optional — don't block the chat
        }

        return {
          question,
          suggestions,
          complete: false as const,
        };
      }

      // Turn 3 (or any turn >= 3): chat is complete
      return {
        question: undefined,
        suggestions: [] as string[],
        complete: true as const,
      };
    }),

  /**
   * Validate procedure — the main validation pipeline.
   *
   * Steps:
   * 1. Eligibility check + consume card (atomic transaction)
   * 2. Read project data
   * 3. Build research brief
   * 4. Call Sonar Pro
   * 5. Extract CardResult via Haiku
   * 6. Save to project
   * 7. Return CardResult
   *
   * On API failure (steps 4-5): refund the card and throw.
   */
  validate: protectedProcedure
    .input(validateCardSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId, chatMessages } = input;

      // ------------------------------------------------------------------
      // Step 1: Eligibility check + consume card in a transaction
      // ------------------------------------------------------------------
      type CardConsumption = {
        type: 'free' | 'auto_provision' | 'paid' | 'monthly_reset';
        previousFreeCardUsed: boolean;
        previousMobileCardCount: number;
      };

      let consumption: CardConsumption;

      try {
        consumption = await ctx.db.transaction(async (tx) => {
          // Read current user state
          const user = await tx.query.users.findFirst({
            where: eq(users.id, ctx.userId),
            columns: {
              freeCardUsed: true,
              mobileCardCount: true,
              mobileCardResetAt: true,
            },
          });

          if (!user) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
          }

          const { freeCardUsed, mobileCardCount, mobileCardResetAt } = user;

          // State A: Free card available
          if (!freeCardUsed) {
            await tx
              .update(users)
              .set({ freeCardUsed: true })
              .where(eq(users.id, ctx.userId));

            return {
              type: 'free' as const,
              previousFreeCardUsed: false,
              previousMobileCardCount: mobileCardCount,
            };
          }

          // State B: Auto-provision (freeCardUsed=true, never provisioned before)
          if (freeCardUsed && mobileCardResetAt === null) {
            const oneMonthFromNow = new Date();
            oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

            await tx
              .update(users)
              .set({
                mobileCardCount: 9, // 10 provisioned, 1 consumed
                mobileCardResetAt: oneMonthFromNow,
              })
              .where(eq(users.id, ctx.userId));

            return {
              type: 'auto_provision' as const,
              previousFreeCardUsed: true,
              previousMobileCardCount: 0,
            };
          }

          // State C: Paid cards available
          if (freeCardUsed && mobileCardCount > 0) {
            const result = await tx
              .update(users)
              .set({
                mobileCardCount: sql`mobile_card_count - 1`,
              })
              .where(and(eq(users.id, ctx.userId), gt(users.mobileCardCount, 0)))
              .returning();

            if (result.length === 0) {
              throw new TRPCError({ code: 'FORBIDDEN', message: 'NO_CARDS_REMAINING' });
            }

            return {
              type: 'paid' as const,
              previousFreeCardUsed: true,
              previousMobileCardCount: mobileCardCount,
            };
          }

          // State D: Monthly reset needed (resetAt is past due)
          if (freeCardUsed && mobileCardCount === 0 && mobileCardResetAt && mobileCardResetAt < new Date()) {
            // Advance resetAt by 1 month from current resetAt
            const newResetAt = new Date(mobileCardResetAt);
            newResetAt.setMonth(newResetAt.getMonth() + 1);

            await tx
              .update(users)
              .set({
                mobileCardCount: 9, // 10 reset, 1 consumed
                mobileCardResetAt: newResetAt,
              })
              .where(eq(users.id, ctx.userId));

            return {
              type: 'monthly_reset' as const,
              previousFreeCardUsed: true,
              previousMobileCardCount: 0,
            };
          }

          // State E: Card limit reached
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'CARD_LIMIT_REACHED',
          });
        });
      } catch (error) {
        // Re-throw TRPCErrors as-is
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'VALIDATION_FAILED',
          cause: error,
        });
      }

      // ------------------------------------------------------------------
      // Step 2: Read project
      // ------------------------------------------------------------------
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, projectId), eq(projects.userId, ctx.userId)),
        columns: { id: true, title: true, description: true },
      });

      if (!project) {
        // Refund since we already consumed
        await refundCard(ctx.db, ctx.userId, consumption);
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
      }

      // ------------------------------------------------------------------
      // Step 3: Build research brief
      // ------------------------------------------------------------------
      const brief = buildResearchBrief(project.title, project.description, chatMessages);

      // ------------------------------------------------------------------
      // Steps 4-5: Call Sonar Pro + Extract CardResult (with refund on failure)
      // ------------------------------------------------------------------
      let cardResult: CardResult;

      try {
        // Step 4: Call Sonar Pro
        console.log(`[SparkCard] Calling Sonar Pro for project ${projectId}...`);
        const sonarResponse = await sonarProResearch(brief);

        // Step 5: Extract CardResult via Haiku
        console.log(`[SparkCard] Extracting CardResult...`);
        cardResult = await extractCardResult(sonarResponse.text, sonarResponse.citations);
      } catch (error) {
        // Refund the card on API failure
        console.error(`[SparkCard] API failure, refunding card:`, error instanceof Error ? error.message : error);
        await refundCard(ctx.db, ctx.userId, consumption);

        const message = error instanceof Error && error.message.includes('timeout')
          ? 'SONAR_TIMEOUT'
          : 'EXTRACTION_FAILED';

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message,
          cause: error,
        });
      }

      // ------------------------------------------------------------------
      // Step 6: Save CardResult to project
      // ------------------------------------------------------------------
      await ctx.db
        .update(projects)
        .set({ cardResult })
        .where(and(eq(projects.id, projectId), eq(projects.userId, ctx.userId)));

      console.log(`[SparkCard] Validation complete for project ${projectId}, verdict: ${cardResult.verdict}`);

      // ------------------------------------------------------------------
      // Step 7: Return
      // ------------------------------------------------------------------
      return { cardResult };
    }),

  /**
   * Promote procedure — marks a project as promoted and returns the web URL.
   */
  promote: protectedProcedure
    .input(promoteCardSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId } = input;

      // Verify ownership
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, projectId), eq(projects.userId, ctx.userId)),
        columns: { id: true },
      });

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
      }

      await ctx.db
        .update(projects)
        .set({
          promoted: true,
          promotedAt: new Date(),
        })
        .where(eq(projects.id, projectId));

      return {
        webUrl: `https://app.ideafuel.ai/projects/${projectId}`,
      };
    }),
});

// ============================================================================
// Helpers
// ============================================================================

/**
 * Refund a consumed card by reversing the transaction changes.
 */
async function refundCard(
  dbInstance: typeof db,
  userId: string,
  consumption: {
    type: 'free' | 'auto_provision' | 'paid' | 'monthly_reset';
    previousFreeCardUsed: boolean;
    previousMobileCardCount: number;
  }
): Promise<void> {
  try {
    switch (consumption.type) {
      case 'free':
        await dbInstance
          .update(users)
          .set({ freeCardUsed: false })
          .where(eq(users.id, userId));
        break;

      case 'auto_provision':
        // Reverse: set back to no provision
        await dbInstance
          .update(users)
          .set({
            mobileCardCount: 0,
            mobileCardResetAt: null,
          })
          .where(eq(users.id, userId));
        break;

      case 'paid':
        await dbInstance
          .update(users)
          .set({
            mobileCardCount: sql`${users.mobileCardCount} + 1`,
          })
          .where(eq(users.id, userId));
        break;

      case 'monthly_reset':
        // Reverse: restore to pre-reset state
        await dbInstance
          .update(users)
          .set({
            mobileCardCount: consumption.previousMobileCardCount,
            // Note: we can't perfectly restore mobileCardResetAt to its old value
            // since the tx already committed. But setting count=0 effectively means
            // the next call will re-trigger the reset.
          })
          .where(eq(users.id, userId));
        break;
    }

    console.log(`[SparkCard] Refunded card (type: ${consumption.type}) for user ${userId.slice(0, 8)}...`);
  } catch (refundError) {
    // Log but don't throw — the original error is more important
    console.error(`[SparkCard] Failed to refund card:`, refundError);
  }
}
