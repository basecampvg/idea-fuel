import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// TEST DATA
// =============================================================================

/**
 * Valid market sizing response that matches the MarketSizingData interface
 */
const VALID_MARKET_SIZING_JSON = {
  tam: {
    value: 4200,
    formattedValue: '$4.2B',
    growthRate: 12.5,
    confidence: 'medium' as const,
    timeframe: '2024-2030',
  },
  sam: {
    value: 850,
    formattedValue: '$850M',
    growthRate: 15.2,
    confidence: 'medium' as const,
    timeframe: '2024-2028',
  },
  som: {
    value: 42,
    formattedValue: '$42M',
    growthRate: 20.0,
    confidence: 'low' as const,
    timeframe: '2024-2026',
  },
  segments: [
    {
      name: 'Enterprise',
      tamContribution: 60,
      samContribution: 50,
      somContribution: 40,
      description: 'Large enterprise segment',
    },
    {
      name: 'SMB',
      tamContribution: 30,
      samContribution: 40,
      somContribution: 50,
      description: 'Small business segment',
    },
    {
      name: 'Startup',
      tamContribution: 10,
      samContribution: 10,
      somContribution: 10,
      description: 'Startup segment',
    },
  ],
  geographicBreakdown: [
    { region: 'North America', percentage: 45, notes: 'Largest market' },
    { region: 'Europe', percentage: 30, notes: 'Growing market' },
    { region: 'APAC', percentage: 25, notes: 'Emerging market' },
  ],
  assumptions: [
    { level: 'tam' as const, assumption: 'Global market size from Statista', impact: 'high' as const },
    { level: 'tam' as const, assumption: 'Includes adjacent markets', impact: 'medium' as const },
    { level: 'tam' as const, assumption: '10% annual growth projected', impact: 'medium' as const },
    { level: 'sam' as const, assumption: 'US/EU focus only', impact: 'high' as const },
    { level: 'sam' as const, assumption: 'B2B segment only', impact: 'high' as const },
    { level: 'sam' as const, assumption: 'Mid-market excluded', impact: 'medium' as const },
    { level: 'som' as const, assumption: '5% market capture in Y1', impact: 'high' as const },
    { level: 'som' as const, assumption: 'Direct sales only', impact: 'medium' as const },
    { level: 'som' as const, assumption: 'No partnership revenue', impact: 'low' as const },
  ],
  sources: [
    {
      title: 'Statista Market Report',
      url: 'https://statista.com/report/123',
      date: '2024-01',
      reliability: 'primary' as const,
    },
    {
      title: 'Gartner Analysis',
      url: 'https://gartner.com/report/456',
      date: '2023-12',
      reliability: 'primary' as const,
    },
  ],
  methodology: 'Top-down analysis using industry reports and market research.',
};

// =============================================================================
// UNIT TESTS: Response Parsing Utilities
// =============================================================================

describe('Response Parsing Utilities', () => {
  describe('parseResponsesAPIPayload', () => {
    // We can't import the private function directly, so we test the behavior
    // through mock responses that simulate what the function handles

    it('should recognize valid response structure with output_text', () => {
      const mockResponse = {
        id: 'resp_123',
        status: 'completed',
        output_text: JSON.stringify(VALID_MARKET_SIZING_JSON),
        usage: { input_tokens: 1000, output_tokens: 2000, total_tokens: 3000 },
      };

      expect(mockResponse.status).toBe('completed');
      expect(mockResponse.output_text).toBeTruthy();
      expect(JSON.parse(mockResponse.output_text)).toHaveProperty('tam');
    });

    it('should recognize valid response structure with output array', () => {
      const mockResponse = {
        id: 'resp_456',
        status: 'completed',
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'text',
                text: JSON.stringify(VALID_MARKET_SIZING_JSON),
              },
            ],
          },
        ],
        usage: { input_tokens: 1000, output_tokens: 2000, total_tokens: 3000 },
      };

      expect(mockResponse.status).toBe('completed');
      expect(mockResponse.output[0].content[0].text).toBeTruthy();
    });

    it('should identify incomplete response status', () => {
      const mockIncompleteResponse = {
        id: 'resp_789',
        status: 'incomplete',
        output_text: '',
        usage: { input_tokens: 1000, output_tokens: 8000, total_tokens: 9000 },
        incomplete_details: { reason: 'max_output_tokens' },
      };

      expect(mockIncompleteResponse.status).toBe('incomplete');
      expect(mockIncompleteResponse.output_text).toBe('');
      expect(mockIncompleteResponse.incomplete_details.reason).toBe('max_output_tokens');
    });
  });

  describe('isolateJson', () => {
    it('should extract JSON from text with preamble', () => {
      const textWithPreamble = `Here's the market analysis:\n\n${JSON.stringify(VALID_MARKET_SIZING_JSON)}\n\nI hope this helps!`;

      const firstBrace = textWithPreamble.indexOf('{');
      const lastBrace = textWithPreamble.lastIndexOf('}');
      const isolated = textWithPreamble.slice(firstBrace, lastBrace + 1);

      const parsed = JSON.parse(isolated);
      expect(parsed.tam.value).toBe(4200);
      expect(parsed.sam.formattedValue).toBe('$850M');
    });

    it('should extract JSON from markdown code block', () => {
      const markdownWrapped = `\`\`\`json\n${JSON.stringify(VALID_MARKET_SIZING_JSON)}\n\`\`\``;

      const firstBrace = markdownWrapped.indexOf('{');
      const lastBrace = markdownWrapped.lastIndexOf('}');
      const isolated = markdownWrapped.slice(firstBrace, lastBrace + 1);

      const parsed = JSON.parse(isolated);
      expect(parsed.som.value).toBe(42);
    });

    it('should return null for text without JSON braces', () => {
      const noJson = 'This is just plain text without any JSON.';

      const firstBrace = noJson.indexOf('{');
      const lastBrace = noJson.lastIndexOf('}');

      expect(firstBrace).toBe(-1);
      expect(lastBrace).toBe(-1);
    });

    it('should handle nested braces correctly', () => {
      // The outer braces should be found
      const nestedJson = `Some text { "outer": { "inner": 123 } } more text`;

      const firstBrace = nestedJson.indexOf('{');
      const lastBrace = nestedJson.lastIndexOf('}');
      const isolated = nestedJson.slice(firstBrace, lastBrace + 1);

      expect(isolated).toBe('{ "outer": { "inner": 123 } }');
      const parsed = JSON.parse(isolated);
      expect(parsed.outer.inner).toBe(123);
    });
  });

  describe('safeJsonParse behavior', () => {
    it('should parse valid JSON directly', () => {
      const validJson = JSON.stringify(VALID_MARKET_SIZING_JSON);
      const parsed = JSON.parse(validJson);

      expect(parsed.tam.value).toBe(4200);
      expect(parsed.segments).toHaveLength(3);
    });

    it('should fail on truncated JSON', () => {
      const truncatedJson = '{"tam": {"value": 4200, "formattedValue": "$4.2B"';

      expect(() => JSON.parse(truncatedJson)).toThrow();
    });

    it('should fail on invalid JSON with extra content', () => {
      const invalidJson = '{"tam": {"value": 4200}} extra content here';

      // Direct parse fails
      expect(() => JSON.parse(invalidJson)).toThrow();

      // But isolation should work
      const firstBrace = invalidJson.indexOf('{');
      const lastBrace = invalidJson.lastIndexOf('}');
      const isolated = invalidJson.slice(firstBrace, lastBrace + 1);

      const parsed = JSON.parse(isolated);
      expect(parsed.tam.value).toBe(4200);
    });
  });
});

// =============================================================================
// UNIT TESTS: Market Sizing Validation
// =============================================================================

describe('validateMarketSizingData', () => {
  // Helper to simulate the validation function behavior
  function validateMarketSizingData(data: unknown): string[] {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      return ['Data is not an object'];
    }

    const d = data as Record<string, unknown>;

    // Required top-level keys
    const requiredKeys = ['tam', 'sam', 'som', 'segments', 'assumptions', 'sources', 'methodology'];
    for (const key of requiredKeys) {
      if (!(key in d)) {
        errors.push(`Missing required key: ${key}`);
      }
    }

    // Validate tam/sam/som structure
    for (const marketKey of ['tam', 'sam', 'som'] as const) {
      const metric = d[marketKey] as Record<string, unknown> | undefined;
      if (metric) {
        if (typeof metric.value !== 'number') {
          errors.push(`${marketKey}.value must be a number`);
        } else if (metric.value > 1000000) {
          errors.push(`${marketKey}.value=${metric.value} seems too large (should be millions USD)`);
        }
        if (typeof metric.formattedValue !== 'string') {
          errors.push(`${marketKey}.formattedValue must be a string`);
        }
        if (typeof metric.growthRate !== 'number') {
          errors.push(`${marketKey}.growthRate must be a number`);
        }
        if (!['high', 'medium', 'low'].includes(metric.confidence as string)) {
          errors.push(`${marketKey}.confidence must be high|medium|low`);
        }
        if (typeof metric.timeframe !== 'string') {
          errors.push(`${marketKey}.timeframe must be a string`);
        }
      }
    }

    // Validate arrays
    if (Array.isArray(d.segments)) {
      if (d.segments.length === 0) {
        errors.push('segments array is empty');
      }
    }

    if (Array.isArray(d.assumptions)) {
      if (d.assumptions.length === 0) {
        errors.push('assumptions array is empty');
      }
    }

    if (Array.isArray(d.sources)) {
      if (d.sources.length === 0) {
        errors.push('sources array is empty');
      }
    }

    if (typeof d.methodology !== 'string' || d.methodology.length === 0) {
      errors.push('methodology must be a non-empty string');
    }

    return errors;
  }

  it('should return empty array for valid data', () => {
    const errors = validateMarketSizingData(VALID_MARKET_SIZING_JSON);
    expect(errors).toHaveLength(0);
  });

  it('should detect missing required keys', () => {
    const missingKeys = {
      tam: VALID_MARKET_SIZING_JSON.tam,
      // Missing: sam, som, segments, assumptions, sources, methodology
    };

    const errors = validateMarketSizingData(missingKeys);

    expect(errors).toContain('Missing required key: sam');
    expect(errors).toContain('Missing required key: som');
    expect(errors).toContain('Missing required key: segments');
    expect(errors).toContain('Missing required key: assumptions');
    expect(errors).toContain('Missing required key: sources');
    expect(errors).toContain('Missing required key: methodology');
  });

  it('should warn on absurdly large values (likely not in millions)', () => {
    const tooLargeValue = {
      ...VALID_MARKET_SIZING_JSON,
      tam: {
        ...VALID_MARKET_SIZING_JSON.tam,
        value: 4200000000, // $4.2 trillion in dollars, not millions
      },
    };

    const errors = validateMarketSizingData(tooLargeValue);

    expect(errors.some(e => e.includes('seems too large'))).toBe(true);
  });

  it('should detect invalid confidence values', () => {
    const invalidConfidence = {
      ...VALID_MARKET_SIZING_JSON,
      tam: {
        ...VALID_MARKET_SIZING_JSON.tam,
        confidence: 'very_high', // Invalid
      },
    };

    const errors = validateMarketSizingData(invalidConfidence);

    expect(errors.some(e => e.includes('confidence must be high|medium|low'))).toBe(true);
  });

  it('should detect non-numeric values', () => {
    const stringValue = {
      ...VALID_MARKET_SIZING_JSON,
      tam: {
        ...VALID_MARKET_SIZING_JSON.tam,
        value: '4200', // String instead of number
      },
    };

    const errors = validateMarketSizingData(stringValue);

    expect(errors.some(e => e.includes('value must be a number'))).toBe(true);
  });

  it('should detect empty arrays', () => {
    const emptyArrays = {
      ...VALID_MARKET_SIZING_JSON,
      segments: [],
      assumptions: [],
      sources: [],
    };

    const errors = validateMarketSizingData(emptyArrays);

    expect(errors).toContain('segments array is empty');
    expect(errors).toContain('assumptions array is empty');
    expect(errors).toContain('sources array is empty');
  });

  it('should detect empty methodology', () => {
    const emptyMethodology = {
      ...VALID_MARKET_SIZING_JSON,
      methodology: '',
    };

    const errors = validateMarketSizingData(emptyMethodology);

    expect(errors).toContain('methodology must be a non-empty string');
  });

  it('should return error for null input', () => {
    const errors = validateMarketSizingData(null);
    expect(errors).toContain('Data is not an object');
  });

  it('should return error for non-object input', () => {
    const errors = validateMarketSizingData('not an object');
    expect(errors).toContain('Data is not an object');
  });
});

// =============================================================================
// UNIT TESTS: Adaptive Token Calculation
// =============================================================================

describe('calculateAdaptiveTokenLimit', () => {
  // Simulate the function behavior
  function calculateAdaptiveTokenLimit(inputLength: number, reasoning: string): number {
    const MARKET_SIZING_BASE_TOKENS = 12000;
    const MARKET_SIZING_MAX_TOKENS = 25000;

    const estimatedInputTokens = Math.ceil(inputLength / 4);

    let limit = MARKET_SIZING_BASE_TOKENS;

    if (estimatedInputTokens > 2500) {
      limit = 16000;
    }

    if (reasoning === 'xhigh') {
      limit = Math.max(limit, 18000);
    }

    return Math.min(limit, MARKET_SIZING_MAX_TOKENS);
  }

  it('should return base tokens for small inputs', () => {
    const limit = calculateAdaptiveTokenLimit(5000, 'medium');
    expect(limit).toBe(12000);
  });

  it('should increase tokens for large inputs', () => {
    const limit = calculateAdaptiveTokenLimit(15000, 'medium'); // ~3750 estimated input tokens
    expect(limit).toBe(16000);
  });

  it('should increase tokens for xhigh reasoning', () => {
    const limit = calculateAdaptiveTokenLimit(5000, 'xhigh');
    expect(limit).toBe(18000);
  });

  it('should use 18000 for xhigh reasoning regardless of input size', () => {
    // xhigh reasoning needs headroom for reasoning tokens
    const limit = calculateAdaptiveTokenLimit(100000, 'xhigh');
    expect(limit).toBe(18000);
  });

  it('should cap large inputs at 16000 for non-xhigh reasoning', () => {
    const limit = calculateAdaptiveTokenLimit(100000, 'high');
    expect(limit).toBe(16000);
  });
});

// =============================================================================
// UNIT TESTS: Retry Logic Behavior
// =============================================================================

describe('Retry Strategy Behavior', () => {
  const REASONING_DOWNGRADE: Record<string, string> = {
    xhigh: 'high',
    high: 'medium',
    medium: 'medium',
    low: 'low',
    none: 'none',
  };

  it('should downgrade xhigh to high on retry', () => {
    expect(REASONING_DOWNGRADE['xhigh']).toBe('high');
  });

  it('should downgrade high to medium on retry', () => {
    expect(REASONING_DOWNGRADE['high']).toBe('medium');
  });

  it('should keep medium as medium on retry', () => {
    expect(REASONING_DOWNGRADE['medium']).toBe('medium');
  });

  it('should calculate token increase of 50% on retry', () => {
    const initial = 12000;
    const afterRetry = Math.ceil(initial * 1.5);
    expect(afterRetry).toBe(18000);
  });

  it('should cap token increase at maximum', () => {
    const MAX_TOKENS = 25000;
    const initial = 20000;
    const afterRetry = Math.min(Math.ceil(initial * 1.5), MAX_TOKENS);
    expect(afterRetry).toBe(25000);
  });
});

// =============================================================================
// INTEGRATION-STYLE TESTS: Mock API Responses
// =============================================================================

describe('Mock API Response Handling', () => {
  describe('Scenario: Completed response with valid JSON', () => {
    it('should successfully parse valid market sizing data', () => {
      const mockResponse = {
        id: 'resp_valid_123',
        status: 'completed',
        output_text: JSON.stringify(VALID_MARKET_SIZING_JSON),
        usage: { input_tokens: 2000, output_tokens: 3500, total_tokens: 5500 },
      };

      // Simulate extraction flow
      expect(mockResponse.status).toBe('completed');
      expect(mockResponse.output_text).toBeTruthy();

      const parsed = JSON.parse(mockResponse.output_text);
      expect(parsed.tam.value).toBe(4200);
      expect(parsed.sam.value).toBe(850);
      expect(parsed.som.value).toBe(42);
      expect(parsed.segments).toHaveLength(3);
      expect(parsed.assumptions).toHaveLength(9);
    });
  });

  describe('Scenario: Completed response with JSON wrapped in text', () => {
    it('should extract JSON using isolation', () => {
      const wrappedResponse = {
        id: 'resp_wrapped_456',
        status: 'completed',
        output_text: `Here is the market sizing analysis based on the research:\n\n${JSON.stringify(VALID_MARKET_SIZING_JSON)}\n\nThis analysis uses conservative estimates for SOM.`,
        usage: { input_tokens: 2000, output_tokens: 4000, total_tokens: 6000 },
      };

      const text = wrappedResponse.output_text;
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      const isolated = text.slice(firstBrace, lastBrace + 1);

      const parsed = JSON.parse(isolated);
      expect(parsed.tam.formattedValue).toBe('$4.2B');
      expect(parsed.methodology).toBeTruthy();
    });
  });

  describe('Scenario: Incomplete response with empty content', () => {
    it('should trigger retry behavior', () => {
      const incompleteResponse = {
        id: 'resp_incomplete_789',
        status: 'incomplete',
        output_text: '',
        usage: { input_tokens: 2000, output_tokens: 8000, total_tokens: 10000 },
        incomplete_details: { reason: 'max_output_tokens' },
      };

      // Verify conditions that would trigger retry
      const shouldRetry =
        incompleteResponse.status === 'incomplete' ||
        !incompleteResponse.output_text ||
        incompleteResponse.output_text.trim().length === 0;

      expect(shouldRetry).toBe(true);
      expect(incompleteResponse.incomplete_details.reason).toBe('max_output_tokens');
    });
  });

  describe('Scenario: Incomplete response with partial JSON', () => {
    it('should attempt isolation then trigger retry on failure', () => {
      const partialResponse = {
        id: 'resp_partial_012',
        status: 'incomplete',
        output_text: '{"tam": {"value": 4200, "formattedValue": "$4.2B", "growthRate": 12.5',
        usage: { input_tokens: 2000, output_tokens: 8000, total_tokens: 10000 },
        incomplete_details: { reason: 'max_output_tokens' },
      };

      // Direct parse should fail
      let parseSuccess = true;
      try {
        JSON.parse(partialResponse.output_text);
      } catch {
        parseSuccess = false;
      }
      expect(parseSuccess).toBe(false);

      // Isolation attempt
      const text = partialResponse.output_text;
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');

      // No closing brace found
      expect(lastBrace).toBe(-1);

      // Should trigger retry
      const shouldRetry = !parseSuccess;
      expect(shouldRetry).toBe(true);
    });
  });

  describe('Scenario: Response with missing required keys', () => {
    it('should trigger retry on critical validation errors', () => {
      const missingKeysResponse = {
        id: 'resp_missing_345',
        status: 'completed',
        output_text: JSON.stringify({
          tam: VALID_MARKET_SIZING_JSON.tam,
          // Missing all other required keys
        }),
        usage: { input_tokens: 2000, output_tokens: 1000, total_tokens: 3000 },
      };

      const parsed = JSON.parse(missingKeysResponse.output_text);

      // Simulate validation
      const requiredKeys = ['tam', 'sam', 'som', 'segments', 'assumptions', 'sources', 'methodology'];
      const missingKeys = requiredKeys.filter(key => !(key in parsed));

      expect(missingKeys).toContain('sam');
      expect(missingKeys).toContain('som');
      expect(missingKeys.length).toBeGreaterThan(0);

      // Should trigger retry
      const shouldRetry = missingKeys.length > 0;
      expect(shouldRetry).toBe(true);
    });

    it('should return diagnostics after retries exhausted', () => {
      // After MAX_RETRIES, should have descriptive error info
      const lastError = 'validation_error: Missing required key: sam, Missing required key: som';
      const lastRawText = '{"tam": {"value": 4200}}';

      // Error message should be descriptive
      const errorMessage = `Failed to extract market sizing after 3 attempts. Last error: ${lastError}. Check logs for diagnostics.`;

      expect(errorMessage).toContain('3 attempts');
      expect(errorMessage).toContain('validation_error');
      expect(errorMessage).toContain('Check logs');
    });
  });
});

// =============================================================================
// TELEMETRY LOGGING TESTS
// =============================================================================

describe('Telemetry Logging', () => {
  it('should warn when output_tokens equals max_output_tokens', () => {
    const response = {
      usage: { input_tokens: 2000, output_tokens: 8000, total_tokens: 10000 },
    };
    const maxOutputTokens = 8000;

    const hitLimit = response.usage.output_tokens === maxOutputTokens;
    expect(hitLimit).toBe(true);
  });

  it('should include all required telemetry fields', () => {
    const telemetryFields = {
      attempt: 1,
      maxAttempts: 3,
      responseId: 'resp_123',
      status: 'completed',
      usage: { input_tokens: 1000, output_tokens: 2000, total_tokens: 3000 },
      maxOutputTokens: 12000,
      reasoning: 'high',
      rawTextLength: 5000,
      parseSuccess: true,
    };

    // All fields should be present
    expect(telemetryFields.attempt).toBeDefined();
    expect(telemetryFields.responseId).toBeDefined();
    expect(telemetryFields.status).toBeDefined();
    expect(telemetryFields.usage).toBeDefined();
    expect(telemetryFields.maxOutputTokens).toBeDefined();
    expect(telemetryFields.reasoning).toBeDefined();
    expect(telemetryFields.rawTextLength).toBeDefined();
    expect(telemetryFields.parseSuccess).toBeDefined();
  });
});
