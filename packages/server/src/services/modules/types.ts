/**
 * Calculation Module Type Definitions
 *
 * Modules are self-contained calculation sheets that plug into the main
 * financial statements. Each module has:
 *   - Inputs: assumptions it needs (references to Assumptions sheet or other modules)
 *   - Calculations: intermediate rows in the module's sheet
 *   - Outputs: values that feed into P&L, BS, or CF
 *
 * The workbook builder creates a HyperFormula sheet for each active module
 * and wires outputs to statement line items.
 */

import type { AssumptionValueType } from '@forge/shared';

export type ModuleCategory = 'revenue' | 'cost' | 'financing';

/**
 * Layout types determine how the workbook builder populates the module sheet.
 * - standard: rows are line items, columns are periods (most modules)
 * - matrix: triangular/rectangular matrix (LTV cohort — dynamic row count)
 */
export type ModuleLayoutType = 'standard' | 'matrix';

/**
 * An input the module needs from the Assumptions sheet or another module.
 */
export interface ModuleInput {
  /** Assumption key or named expression to reference */
  key: string;
  /** Display name */
  name: string;
  /** Default value if not provided */
  default: number;
  /** Value type for UI rendering */
  valueType: AssumptionValueType;
  /** Unit label */
  unit?: string;
  /**
   * If set, this input reads from another module's output
   * rather than from the Assumptions sheet.
   */
  sourceModule?: string;
  sourceOutputKey?: string;
}

/**
 * A calculation row in the module's sheet.
 * Each row gets one cell per period with a formula.
 */
export interface ModuleCalcRow {
  /** Unique key for this row */
  key: string;
  /** Display name */
  name: string;
  /** Formula for period 1 (seed value). Uses named expressions. */
  firstPeriodFormula: string;
  /** Formula for periods 2+ (references prior column via {PREV} placeholder). */
  formula?: string;
  /** If true, this row is an output that can be wired to statements */
  isOutput?: boolean;
  /** Which statement this output feeds into */
  targetStatement?: 'pl' | 'bs' | 'cf';
  /** Which line item key in the target statement */
  targetLineItem?: string;
}

/**
 * Complete module definition.
 */
export interface ModuleDefinition {
  /** Unique identifier (snake_case) */
  key: string;
  /** Display name */
  name: string;
  /** Module category */
  category: ModuleCategory;
  /** Sheet layout strategy */
  layoutType: ModuleLayoutType;
  /** Other modules this module depends on (for build ordering) */
  dependsOnModules?: string[];
  /** Inputs from Assumptions sheet or other modules */
  inputs: ModuleInput[];
  /** Calculation rows (order determines row position — no hardcoded indices) */
  calculations: ModuleCalcRow[];
  /** Which templates include this module by default */
  defaultTemplates: readonly string[];
}

/**
 * Persisted module state per financial model.
 */
export interface ModelModuleRow {
  id: string;
  modelId: string;
  moduleKey: string;
  isEnabled: boolean;
  settings: Record<string, unknown> | null;
  displayOrder: number;
}
