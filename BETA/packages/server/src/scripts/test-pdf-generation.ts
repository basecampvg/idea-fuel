/**
 * Test script for PDF generation
 * Run with: pnpm tsx --env-file=../../.env src/scripts/test-pdf-generation.ts
 */

import { PrismaClient } from '@prisma/client';
import { generatePDFBuffer, getPDFFilename } from '../lib/pdf';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Looking for idea with full research data...');

  // Find an idea with complete research (market analysis)
  const idea = await prisma.idea.findFirst({
    where: {
      research: {
        status: 'COMPLETE',
        marketAnalysis: { not: null },
      },
    },
    include: {
      research: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  if (!idea) {
    console.log('❌ Could not find idea with full research data. Listing available ideas...');
    const ideas = await prisma.idea.findMany({
      select: { id: true, title: true, research: { select: { status: true, marketAnalysis: true } } },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    });
    ideas.forEach((i, idx) => {
      const hasData = i.research?.marketAnalysis ? 'HAS DATA' : 'no data';
      console.log(`  ${idx + 1}. [${i.research?.status || 'NO RESEARCH'}] ${i.title.slice(0, 50)} (${hasData})`);
    });
    return;
  }

  console.log(`✅ Found idea: "${idea.title}"`);
  console.log(`   Idea ID: ${idea.id}`);
  console.log(`   Status: ${idea.status}`);

  if (!idea.research) {
    console.log('❌ This idea has no research data!');
    return;
  }

  const research = idea.research;
  console.log(`   Research ID: ${research.id}`);
  console.log(`   Research Status: ${research.status}`);

  // Show what data is available
  console.log('\n📊 Available research data:');
  console.log(`   - marketAnalysis: ${research.marketAnalysis ? '✓' : '✗'}`);
  console.log(`   - competitors: ${research.competitors ? '✓' : '✗'}`);
  console.log(`   - painPoints: ${research.painPoints ? '✓' : '✗'}`);
  console.log(`   - positioning: ${research.positioning ? '✓' : '✗'}`);
  console.log(`   - whyNow: ${research.whyNow ? '✓' : '✗'}`);
  console.log(`   - proofSignals: ${research.proofSignals ? '✓' : '✗'}`);
  console.log(`   - keywords: ${research.keywords ? '✓' : '✗'}`);
  console.log(`   - sparkResult: ${research.sparkResult ? '✓' : '✗'}`);
  console.log(`   - Scores: O=${research.opportunityScore} P=${research.problemScore} F=${research.feasibilityScore} W=${research.whyNowScore}`);

  // Test generating each report type
  const reportTypes = [
    'BUSINESS_PLAN',
    'POSITIONING',
    'COMPETITIVE_ANALYSIS',
  ] as const;

  for (const reportType of reportTypes) {
    console.log(`\n📄 Generating ${reportType} PDF...`);

    try {
      const pdfBuffer = await generatePDFBuffer({
        idea: {
          id: idea.id,
          title: idea.title,
          description: idea.description,
        },
        report: {
          id: 'test-report-id',
          type: reportType,
          tier: 'PRO',
          title: reportType.replace(/_/g, ' '),
          content: JSON.stringify({
            executiveSummary: idea.description,
          }),
          sections: { included: ['summary'], locked: [] },
        },
        research: research,
      });

      const filename = getPDFFilename(idea.title, reportType);
      const outputDir = path.join(__dirname, '../../test-output');

      // Create output directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, filename);
      fs.writeFileSync(outputPath, pdfBuffer);

      console.log(`   ✅ Success! Saved to: ${outputPath}`);
      console.log(`   📦 Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    } catch (error) {
      console.error(`   ❌ Failed to generate ${reportType}:`, error);
      if (error instanceof Error) {
        console.error(`   Error message: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
      }
    }
  }

  console.log('\n✨ Test complete!');
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
