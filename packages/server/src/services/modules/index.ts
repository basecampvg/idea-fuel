/**
 * Module Registry
 *
 * Central registry for all calculation modules. Provides lookup by key,
 * template-based defaults, and topological ordering for build dependency.
 */

import type { ModuleDefinition } from './types';
import { marketingFunnelModule } from './marketing-funnel';
import { ltvCohortModule } from './ltv-cohort';
import { payrollModule } from './payroll';
import { cogsVariableModule } from './cogs-variable';
import { debtScheduleModule } from './debt-schedule';

export type { ModuleDefinition, ModuleInput, ModuleCalcRow, ModelModuleRow } from './types';

/** All available modules, keyed by module key. */
const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  [marketingFunnelModule.key]: marketingFunnelModule,
  [ltvCohortModule.key]: ltvCohortModule,
  [payrollModule.key]: payrollModule,
  [cogsVariableModule.key]: cogsVariableModule,
  [debtScheduleModule.key]: debtScheduleModule,
};

/** Get a module by key. */
export function getModule(key: string): ModuleDefinition | null {
  return MODULE_REGISTRY[key] ?? null;
}

/** List all available modules. */
export function listAllModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY);
}

/** Get default modules for a template slug. */
export function getModulesForTemplate(templateSlug: string): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter(
    (m) => m.defaultTemplates.includes(templateSlug),
  );
}

/**
 * Topological sort of modules by dependency order.
 * Modules with no dependencies come first.
 */
export function sortModulesByDependency(modules: ModuleDefinition[]): ModuleDefinition[] {
  const moduleMap = new Map(modules.map((m) => [m.key, m]));
  const sorted: ModuleDefinition[] = [];
  const visited = new Set<string>();

  function visit(mod: ModuleDefinition) {
    if (visited.has(mod.key)) return;
    visited.add(mod.key);

    for (const depKey of mod.dependsOnModules ?? []) {
      const dep = moduleMap.get(depKey);
      if (dep) visit(dep);
    }

    sorted.push(mod);
  }

  for (const mod of modules) {
    visit(mod);
  }

  return sorted;
}
