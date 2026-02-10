'use client';

import { SectionRenderer } from './section-renderer';

interface ReportContentProps {
  report: {
    type: string;
    tier: string;
    content: string;
    sections: unknown;
    status: string;
  };
}

// Define which sections are locked per tier
const TIER_LOCKED_SECTIONS: Record<string, string[]> = {
  BASIC: ['financialProjections', 'teamRequirements', 'milestones', 'advancedAnalytics', 'appendix', 'strategicRecommendations'],
  PRO: ['advancedAnalytics', 'appendix'],
  FULL: [],
};

// Define section order for each report type
const REPORT_SECTION_ORDER: Record<string, string[]> = {
  BUSINESS_PLAN: [
    'executiveSummary',
    'problem',
    'problemStatement',
    'solution',
    'uniqueValueProposition',
    'uvp',
    'targetMarket',
    'marketSize',
    'marketTrends',
    'trends',
    'competitors',
    'competitiveAdvantage',
    'revenueStreams',
    'pricingStrategy',
    'costStructure',
    'marketingStrategy',
    'salesChannels',
    'customerAcquisition',
    'financialProjections',
    'teamRequirements',
    'milestones',
  ],
  POSITIONING: [
    'positioningStatement',
    'tagline',
    'brandVoice',
    'brandPersonality',
    'targetAudience',
    'customerPersona',
    'keyMessages',
    'valuePillars',
    'uniqueSellingPoints',
    'competitivePositioning',
  ],
  COMPETITIVE_ANALYSIS: [
    'marketOverview',
    'industryTrends',
    'competitors',
    'swot',
    'competitiveAdvantages',
    'differentiators',
    'marketGaps',
    'underservedSegments',
    'strategicRecommendations',
    'competitiveStrategy',
  ],
};

// Parse content - handles JSON or markdown
function parseContent(content: string): Record<string, unknown> {
  if (!content) return {};

  try {
    const parsed = JSON.parse(content);
    return typeof parsed === 'object' && parsed !== null ? parsed : { rawContent: content };
  } catch {
    // Not JSON, treat as markdown/text
    return { rawContent: content };
  }
}

// Get sections object from report
function parseSections(sections: unknown): { included: string[]; locked: string[] } {
  if (!sections || typeof sections !== 'object') {
    return { included: [], locked: [] };
  }

  const sectionsObj = sections as Record<string, unknown>;
  return {
    included: Array.isArray(sectionsObj.included) ? sectionsObj.included : [],
    locked: Array.isArray(sectionsObj.locked) ? sectionsObj.locked : [],
  };
}

export function ReportContent({ report }: ReportContentProps) {
  const contentData = parseContent(report.content);
  const { locked: lockedFromDb } = parseSections(report.sections);

  // Determine locked sections based on tier
  const tierLockedSections = TIER_LOCKED_SECTIONS[report.tier] || TIER_LOCKED_SECTIONS.BASIC;
  const allLockedSections = new Set([...lockedFromDb, ...tierLockedSections]);

  // Get section order for this report type
  const sectionOrder = REPORT_SECTION_ORDER[report.type] || [];

  // Get all content keys
  const contentKeys = Object.keys(contentData);

  // Sort content keys: ordered sections first, then remaining keys
  const sortedKeys = [
    ...sectionOrder.filter((key) => contentKeys.includes(key)),
    ...contentKeys.filter((key) => !sectionOrder.includes(key)),
  ];

  // Filter out empty values and internal keys
  const validKeys = sortedKeys.filter((key) => {
    const value = contentData[key];
    // Skip null, undefined, empty strings, empty arrays, empty objects
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && !value.trim()) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
  });

  if (validKeys.length === 0) {
    return (
      <div className="section-card">
        <div className="text-center py-8">
          <p className="text-muted-foreground">No content available for this report yet.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Content will appear here once the report is fully generated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {validKeys.map((key) => (
        <SectionRenderer
          key={key}
          sectionKey={key}
          value={contentData[key]}
          isLocked={allLockedSections.has(key)}
        />
      ))}
    </div>
  );
}
