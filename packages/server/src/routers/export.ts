/**
 * Export Router
 *
 * Generates Excel and PDF exports for financial models.
 * Runs synchronously (per scope reduction #4 — typical generation 5-10s).
 */

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { entityId } from '@forge/shared';
import { TRPCError } from '@trpc/server';
import { financialModels, scenarios, assumptions } from '../db/schema';
import { logAuditAsync, formatResource } from '../lib/audit';
import { getTemplate } from '../services/financial-templates';
import { assumptionsToMap } from '../services/financial-calculator';
import { buildWorkbook, readStatements, enrichStatements } from '../services/hyperformula-engine';
import type { AssumptionRow } from '../services/hyperformula-engine';
import { calculateBreakEven } from '../services/break-even-calculator';
import type { RevenueModel } from '../services/break-even-calculator';
import { generateExcelBuffer } from '../lib/excel/generator';
import { renderToBuffer } from '@react-pdf/renderer';
import { FinancialModelPDF } from '../lib/pdf/templates/financial-model';
import { generateNarratives } from '../services/financial-narrator';
import type { ExportPurpose } from '../services/financial-narrator';
import type { Context } from '../context';
// Ensure fonts are registered before any PDF rendering
import '../lib/pdf/fonts';

import React from 'react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadModelAndStatements(
  db: Context['db'],
  modelId: string,
  scenarioId: string,
  userId: string,
) {
  // Verify ownership
  const model = await db.query.financialModels.findFirst({
    where: eq(financialModels.id, modelId),
  });
  if (!model || model.userId !== userId) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Financial model not found' });
  }

  // Verify scenario belongs to model
  const scenario = await db.query.scenarios.findFirst({
    where: eq(scenarios.id, scenarioId),
  });
  if (!scenario || scenario.modelId !== modelId) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Scenario not found' });
  }

  // Get template
  const templateSlug = (model.settings as Record<string, unknown>)?.templateSlug as string ?? 'general';
  const template = getTemplate(templateSlug);
  if (!template) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Template "${templateSlug}" not found` });
  }

  // Fetch assumptions
  const rows = await db
    .select()
    .from(assumptions)
    .where(eq(assumptions.scenarioId, scenarioId));

  const assumptionMap = assumptionsToMap(rows);

  // Build HyperFormula workbook and compute statements
  const assumptionRows: AssumptionRow[] = rows.map(r => ({
    key: r.key,
    value: r.value,
    numericValue: r.numericValue,
    formula: r.formula,
  }));
  const hf = buildWorkbook({ assumptions: assumptionRows, template, forecastYears: model.forecastYears });
  const rawStatements = readStatements(hf, model.forecastYears);
  const statements = enrichStatements(rawStatements, template);
  hf.destroy();

  return { model, scenario, template, rows, assumptionMap, statements };
}

function detectRevenueModel(assumptionMap: Record<string, number>): RevenueModel {
  if (assumptionMap.arpu || assumptionMap.monthly_churn || assumptionMap.new_customers_per_month) {
    return 'subscription';
  }
  if (assumptionMap.hourly_rate || assumptionMap.billable_hours) {
    return 'services';
  }
  return 'unit';
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const exportRouter = router({
  /**
   * Generate Excel export (synchronous — returns base64 buffer).
   */
  generateExcel: protectedProcedure
    .input(z.object({
      modelId: entityId,
      scenarioId: entityId,
    }))
    .mutation(async ({ ctx, input }) => {
      const { model, scenario, rows, statements } = await loadModelAndStatements(
        ctx.db, input.modelId, input.scenarioId, ctx.userId,
      );

      const buffer = await generateExcelBuffer({
        modelName: model.name,
        scenarioName: scenario.name,
        forecastYears: model.forecastYears,
        assumptions: rows.map((r) => ({
          key: r.key,
          name: r.name,
          category: r.category,
          value: r.value,
          numericValue: r.numericValue,
          valueType: r.valueType,
          unit: r.unit,
          formula: r.formula,
        })),
        statements,
      });

      logAuditAsync({
        userId: ctx.userId,
        action: 'EXPORT_EXCEL',
        resource: formatResource('financial_model', input.modelId),
        metadata: { scenarioId: input.scenarioId },
      });

      return {
        buffer: buffer.toString('base64'),
        filename: `${model.name.replace(/[^a-zA-Z0-9-_ ]/g, '')}_${scenario.name}_financial_model.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }),

  /**
   * Generate PDF export (investor deck — synchronous).
   */
  generatePDF: protectedProcedure
    .input(z.object({
      modelId: entityId,
      scenarioId: entityId,
      purpose: z.enum(['investor', 'loan', 'internal']).default('investor'),
      narratives: z.object({
        executiveSummary: z.string().optional(),
        revenueAnalysis: z.string().optional(),
        costAnalysis: z.string().optional(),
        cashPosition: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { model, scenario, rows, assumptionMap, statements } = await loadModelAndStatements(
        ctx.db, input.modelId, input.scenarioId, ctx.userId,
      );

      // Use provided narratives or generate with AI
      let narratives = input.narratives as {
        executiveSummary?: string;
        revenueAnalysis?: string;
        costAnalysis?: string;
        cashPosition?: string;
      } | undefined;

      if (!narratives?.executiveSummary) {
        narratives = await generateNarratives({
          modelName: model.name,
          scenarioName: scenario.name,
          forecastYears: model.forecastYears,
          statements,
          assumptions: rows.map((r) => ({
            key: r.key,
            name: r.name,
            value: r.value,
            category: r.category,
            valueType: r.valueType,
          })),
          purpose: input.purpose as ExportPurpose,
        });
      }

      // Calculate break-even
      const revenueModel = detectRevenueModel(assumptionMap);
      const fixedCostsMonthly = (assumptionMap.rent ?? 0)
        + (assumptionMap.salaries ?? 0)
        + (assumptionMap.infrastructure_costs ?? 0)
        + (assumptionMap.marketing_budget ?? 0)
        + (assumptionMap.other_fixed_costs ?? 0)
        + (assumptionMap.total_opex ?? assumptionMap.operating_expenses ?? 0);

      let breakEven = null;
      try {
        breakEven = calculateBreakEven({
          revenueModel,
          fixedCostsMonthly: fixedCostsMonthly || assumptionMap.fixed_costs_monthly || 10000,
          pricePerUnit: assumptionMap.unit_price ?? assumptionMap.price_per_unit,
          variableCostPerUnit: assumptionMap.variable_cost ?? assumptionMap.cogs_per_unit,
          unitsPerMonth: assumptionMap.units_per_month,
          arpu: assumptionMap.arpu,
          monthlyChurnRate: assumptionMap.monthly_churn,
          newCustomersPerMonth: assumptionMap.new_customers_per_month,
          startingCustomers: assumptionMap.starting_customers ?? 0,
          hourlyRate: assumptionMap.hourly_rate,
          variableCostPerHour: assumptionMap.variable_cost_per_hour,
          billableHoursPerMonth: assumptionMap.billable_hours,
        });
      } catch {
        // Break-even not calculable — OK to proceed without
      }

      const element = React.createElement(FinancialModelPDF, {
        modelName: model.name,
        scenarioName: scenario.name,
        forecastYears: model.forecastYears,
        statements,
        narratives,
        breakEven,
        assumptions: rows.map((r) => ({
          key: r.key,
          name: r.name,
          category: r.category,
          value: r.value,
          valueType: r.valueType,
          unit: r.unit,
        })),
        purpose: input.purpose as 'investor' | 'loan' | 'internal',
      });

      const buffer = await renderToBuffer(element as any);

      logAuditAsync({
        userId: ctx.userId,
        action: 'EXPORT_PDF',
        resource: formatResource('financial_model', input.modelId),
        metadata: { scenarioId: input.scenarioId, purpose: input.purpose },
      });

      return {
        buffer: Buffer.from(buffer).toString('base64'),
        filename: `${model.name.replace(/[^a-zA-Z0-9-_ ]/g, '')}_${scenario.name}_financial_projections.pdf`,
        contentType: 'application/pdf',
      };
    }),

  /**
   * Generate AI narratives for preview before export.
   */
  generateNarratives: protectedProcedure
    .input(z.object({
      modelId: entityId,
      scenarioId: entityId,
      purpose: z.enum(['investor', 'loan', 'internal']).default('investor'),
    }))
    .mutation(async ({ ctx, input }) => {
      const { model, scenario, rows, statements } = await loadModelAndStatements(
        ctx.db, input.modelId, input.scenarioId, ctx.userId,
      );

      const narratives = await generateNarratives({
        modelName: model.name,
        scenarioName: scenario.name,
        forecastYears: model.forecastYears,
        statements,
        assumptions: rows.map((r) => ({
          key: r.key,
          name: r.name,
          value: r.value,
          category: r.category,
          valueType: r.valueType,
        })),
        purpose: input.purpose as ExportPurpose,
      });

      return narratives;
    }),
});
