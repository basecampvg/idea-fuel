/**
 * Excel Formula Injection Sanitizer
 *
 * Prevents CSV/Excel formula injection attacks in exported files.
 * Text values starting with =, +, -, @, \t, \r could execute as
 * formulas when opened in Excel, potentially running commands or
 * exfiltrating data.
 *
 * Apply to ALL user-controlled text written to Excel cells:
 * assumption names, categories, line item labels, sheet names, etc.
 */

const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitize a text value for safe inclusion in an Excel cell.
 * Prefixes dangerous values with a single quote (') which Excel
 * treats as a text prefix, preventing formula execution.
 */
export function sanitizeTextCell(value: string): string {
  if (!value || value.length === 0) return value;

  // Check if the first character is dangerous
  if (DANGEROUS_PREFIXES.includes(value[0])) {
    return `'${value}`;
  }

  return value;
}

/**
 * Sanitize an Excel sheet name.
 * Sheet names have additional restrictions beyond formula injection.
 */
export function sanitizeSheetName(name: string): string {
  let safe = sanitizeTextCell(name);
  // Excel sheet names cannot contain: \ / ? * [ ]
  safe = safe.replace(/[\\/?*[\]]/g, '_');
  // Max 31 characters
  safe = safe.slice(0, 31);
  return safe;
}
