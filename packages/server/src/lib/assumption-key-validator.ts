/**
 * Assumption Key Validator
 *
 * Validates that assumption keys are safe to use as HyperFormula named expressions.
 * Prevents:
 * - Cell reference collisions (e.g., "Q4", "A1", "R1C1")
 * - Built-in function shadowing (e.g., "sum", "if", "pmt")
 * - Invalid characters
 */

// Cell reference patterns: A1, AB12, ZZ999, etc.
const CELL_REFERENCE_PATTERN = /^[A-Z]{1,3}\d+$/i;

// R1C1-style patterns
const R1C1_PATTERN = /^R\d*C\d*$/i;

/**
 * All HyperFormula built-in function names that could be shadowed.
 * This includes financial, math, statistical, logical, text, date, and lookup functions.
 */
const HYPERFORMULA_BUILTINS = new Set([
  // Logical
  'AND', 'FALSE', 'IF', 'IFERROR', 'IFNA', 'IFS', 'NOT', 'OR', 'SWITCH', 'TRUE', 'XOR',
  // Math
  'ABS', 'ACOS', 'ACOSH', 'ACOT', 'ACOTH', 'ASIN', 'ASINH', 'ATAN', 'ATAN2', 'ATANH',
  'BASE', 'CEILING', 'COMBIN', 'COMBINA', 'COS', 'COSH', 'COT', 'COTH', 'COUNTBLANK',
  'DECIMAL', 'DEGREES', 'EVEN', 'EXP', 'FACT', 'FACTDOUBLE', 'FLOOR', 'GCD', 'INT',
  'LCM', 'LN', 'LOG', 'LOG10', 'MOD', 'MROUND', 'MULTINOMIAL', 'ODD', 'PI', 'POWER',
  'PRODUCT', 'QUOTIENT', 'RADIANS', 'RAND', 'RANDBETWEEN', 'ROUND', 'ROUNDDOWN',
  'ROUNDUP', 'SERIESSUM', 'SIGN', 'SIN', 'SINH', 'SQRT', 'SQRTPI', 'SUBTOTAL',
  'SUM', 'SUMIF', 'SUMIFS', 'SUMPRODUCT', 'SUMSQ', 'TAN', 'TANH', 'TRUNC',
  // Statistical
  'AVERAGE', 'AVERAGEA', 'AVERAGEIF', 'AVERAGEIFS', 'BETA', 'BINOM', 'CHISQ',
  'CONFIDENCE', 'CORREL', 'COUNT', 'COUNTA', 'COUNTIF', 'COUNTIFS', 'COVARIANCE',
  'DEVSQ', 'EXPON', 'F', 'FISHER', 'FISHERINV', 'FORECAST', 'FREQUENCY', 'GAMMA',
  'GAMMALN', 'GAUSS', 'GEOMEAN', 'GROWTH', 'HARMEAN', 'HYPGEOM', 'INTERCEPT', 'KURT',
  'LARGE', 'LINEST', 'LOGEST', 'LOGNORM', 'MAX', 'MAXA', 'MAXIFS', 'MEDIAN', 'MIN',
  'MINA', 'MINIFS', 'MODE', 'NEGBINOM', 'NORM', 'NORMINV', 'NORMSDIST', 'NORMSINV',
  'PEARSON', 'PERCENTILE', 'PERCENTRANK', 'PERMUT', 'PERMUTATIONA', 'PHI', 'POISSON',
  'PROB', 'QUARTILE', 'RANK', 'RSQ', 'SKEW', 'SLOPE', 'SMALL', 'STANDARDIZE',
  'STDEV', 'STDEVA', 'STDEVP', 'STDEVPA', 'STEYX', 'T', 'TREND', 'TRIMMEAN',
  'VAR', 'VARA', 'VARP', 'VARPA', 'WEIBULL', 'Z',
  // Financial
  'CUMIPMT', 'CUMPRINC', 'DB', 'DDB', 'DOLLARDE', 'DOLLARFR', 'EFFECT', 'FV',
  'FVSCHEDULE', 'IPMT', 'IRR', 'ISPMT', 'MIRR', 'NOMINAL', 'NPER', 'NPV',
  'PDURATION', 'PMT', 'PPMT', 'PV', 'RATE', 'RRI', 'SLN', 'SYD',
  'TBILLEQ', 'TBILLPRICE', 'TBILLYIELD', 'XNPV',
  // Lookup
  'ADDRESS', 'CHOOSE', 'COLUMN', 'COLUMNS', 'FORMULATEXT', 'HLOOKUP', 'INDEX',
  'INDIRECT', 'LOOKUP', 'MATCH', 'OFFSET', 'ROW', 'ROWS', 'TRANSPOSE', 'VLOOKUP',
  // Text
  'CHAR', 'CLEAN', 'CODE', 'CONCATENATE', 'DOLLAR', 'EXACT', 'FIND', 'FIXED',
  'LEFT', 'LEN', 'LOWER', 'MID', 'PROPER', 'REPLACE', 'REPT', 'RIGHT', 'SEARCH',
  'SUBSTITUTE', 'TEXT', 'TEXTJOIN', 'TRIM', 'UNICHAR', 'UNICODE', 'UPPER', 'VALUE',
  // Date/Time
  'DATE', 'DATEVALUE', 'DAY', 'DAYS', 'DAYS360', 'EDATE', 'EOMONTH', 'HOUR',
  'ISOWEEKNUM', 'MINUTE', 'MONTH', 'NETWORKDAYS', 'NOW', 'SECOND', 'TIME',
  'TIMEVALUE', 'TODAY', 'WEEKDAY', 'WEEKNUM', 'WORKDAY', 'YEAR', 'YEARFRAC',
  // Info
  'ERRORTYPE', 'ISBLANK', 'ISERR', 'ISERROR', 'ISEVEN', 'ISFORMULA', 'ISLOGICAL',
  'ISNA', 'ISNONTEXT', 'ISNUMBER', 'ISODD', 'ISREF', 'ISTEXT', 'N', 'NA',
  'SHEET', 'SHEETS', 'TYPE',
  // Engineering
  'BIN2DEC', 'BIN2HEX', 'BIN2OCT', 'BITAND', 'BITLSHIFT', 'BITOR', 'BITRSHIFT',
  'BITXOR', 'COMPLEX', 'DEC2BIN', 'DEC2HEX', 'DEC2OCT', 'DELTA', 'ERF', 'ERFC',
  'GESTEP', 'HEX2BIN', 'HEX2DEC', 'HEX2OCT', 'IMABS', 'IMAGINARY', 'IMARGUMENT',
  'IMCONJUGATE', 'IMCOS', 'IMCOSH', 'IMCOT', 'IMCSC', 'IMCSCH', 'IMDIV', 'IMEXP',
  'IMLN', 'IMLOG10', 'IMLOG2', 'IMPOWER', 'IMPRODUCT', 'IMREAL', 'IMSEC', 'IMSECH',
  'IMSIN', 'IMSINH', 'IMSQRT', 'IMSUB', 'IMSUM', 'IMTAN', 'OCT2BIN', 'OCT2DEC', 'OCT2HEX',
  // Other
  'HYPERLINK', 'WEBSERVICE',
  // Also block ERROR and common Excel constants
  'ERROR', 'NULL', 'UNDEFINED', 'NAN', 'INFINITY',
]);

export interface KeyValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate an assumption key for use as a HyperFormula named expression.
 */
export function validateAssumptionKey(key: string): KeyValidationResult {
  // Must be non-empty
  if (!key || key.length === 0) {
    return { valid: false, error: 'Key cannot be empty' };
  }

  // Must be lowercase snake_case: start with letter or underscore, then letters/digits/underscores
  if (!/^[a-z_][a-z0-9_]*$/.test(key)) {
    return { valid: false, error: 'Key must be lowercase snake_case (letters, digits, underscores)' };
  }

  // Must not match a cell reference pattern (case-insensitive)
  if (CELL_REFERENCE_PATTERN.test(key)) {
    return { valid: false, error: `Key "${key}" conflicts with a cell reference` };
  }

  // Must not match R1C1 pattern
  if (R1C1_PATTERN.test(key)) {
    return { valid: false, error: `Key "${key}" conflicts with R1C1 cell reference` };
  }

  // Must not shadow a HyperFormula built-in function
  if (HYPERFORMULA_BUILTINS.has(key.toUpperCase())) {
    return { valid: false, error: `Key "${key}" conflicts with built-in function ${key.toUpperCase()}` };
  }

  // Length limit
  if (key.length > 100) {
    return { valid: false, error: 'Key must be 100 characters or fewer' };
  }

  return { valid: true };
}

/**
 * Validate a user-submitted formula for safety.
 * Rejects formulas that reference raw cell addresses (only named expressions allowed).
 */
export function validateFormulaContent(formula: string): KeyValidationResult {
  // Check for raw cell references like A1, Sheet1!B2, etc.
  const cellRefPattern = /(?<![a-z_])([A-Z]{1,3}\d+)(?![a-z_\d])/g;
  const match = cellRefPattern.exec(formula);
  if (match) {
    return {
      valid: false,
      error: `Formula contains raw cell reference "${match[1]}". Use named assumptions instead.`,
    };
  }

  // Check for sheet references (Sheet1!...)
  if (/[A-Za-z_]+![A-Z]/i.test(formula)) {
    return {
      valid: false,
      error: 'Formula contains sheet references. Use named assumptions instead.',
    };
  }

  return { valid: true };
}
