/**
 * Financial Model Loader
 *
 * Loads a project's financial model data (assumptions, computed P&L, break-even)
 * for use in business plan generation. Returns null when no model exists,
 * allowing the caller to fall back to AI-estimated financials.
 */

import { db } from '../db/drizzle';
import { eq, and } from 'drizzle-orm';
import { financialModels, scenarios, assumptions } from '../db/schema';
import { getTemplate } from './financial-templates';
import { assumptionsToMap } from './financial-calculator';
import { buildWorkbook, readStatements, enrichStatements } from './hyperformula-engine';
import type { AssumptionRow } from './hyperformula-engine';
import { calculateBreakEven, type BreakEvenResult, type RevenueModel } from './break-even-calculator';
import type { ComputedStatements } from '@forge/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoadedFinancialData {
  modelId: string;
  templateSlug: string;
  forecastYears: number;
  statements: ComputedStatements;
  breakEven: BreakEvenResult;
  assumptionRows: Array<{
    key: string;
    name: string;
    value: string | null;
    numericValue: string | null;
    unit: string | null;
    category: string;
    confidence: string;
  }>;
  assumptionMap: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function loadFinancialDataForProject(
  projectId: string,
): Promise<LoadedFinancialData | null> {
  // 1. Find the best model: prefer ACTIVE, then DRAFT, skip ARCHIVED
  let model = await db.query.financialModels.findFirst({
    where: and(
      eq(financialModels.projectId, projectId),
      eq(financialModels.status, 'ACTIVE'),
    ),
  });
  if (!model) {
    model = await db.query.financialModels.findFirst({
      where: and(
        eq(financialModels.projectId, projectId),
        eq(financialModels.status, 'DRAFT'),
      ),
    });
  }

  if (!model) return null;

  // 2. Find the base scenario
  const baseScenario = await db.query.scenarios.findFirst({
    where: and(
      eq(scenarios.modelId, model.id),
      eq(scenarios.isBase, true),
    ),
  });

  if (!baseScenario) return null;

  // 3. Load assumptions for the base scenario
  const rows = await db
    .select()
    .from(assumptions)
    .where(eq(assumptions.scenarioId, baseScenario.id));

  if (rows.length === 0) return null;

  // 4. Resolve the template
  const templateSlug =
    (model.settings as Record<string, unknown>)?.templateSlug as string ?? 'general';
  const template = getTemplate(templateSlug);
  if (!template) return null;

  // 5. Compute 3-statement financials via HyperFormula
  const assumptionMap = assumptionsToMap(rows);
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

  // 6. Compute break-even (revenue model detection from financial.ts:344-372)
  let revenueModel: RevenueModel = 'unit';
  if (assumptionMap.arpu || assumptionMap.monthly_churn || assumptionMap.new_customers_per_month) {
    revenueModel = 'subscription';
  } else if (assumptionMap.hourly_rate || assumptionMap.billable_hours) {
    revenueModel = 'services';
  }

  const fixedCostsMonthly =
    (assumptionMap.rent ?? 0) +
    (assumptionMap.salaries ?? 0) +
    (assumptionMap.infrastructure_costs ?? 0) +
    (assumptionMap.marketing_budget ?? 0) +
    (assumptionMap.other_fixed_costs ?? 0) +
    (assumptionMap.total_opex ?? assumptionMap.operating_expenses ?? 0);

  const breakEven = calculateBreakEven({
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

  return {
    modelId: model.id,
    templateSlug,
    forecastYears: model.forecastYears,
    statements,
    breakEven,
    assumptionRows: rows.map((r) => ({
      key: r.key,
      name: r.name,
      value: r.value,
      numericValue: r.numericValue,
      unit: r.unit,
      category: r.category,
      confidence: r.confidence,
    })),
    assumptionMap,
  };
}
