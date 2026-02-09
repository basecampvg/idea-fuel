/**
 * List research records to find one with data
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const researches = await prisma.research.findMany({
    select: {
      id: true,
      status: true,
      currentPhase: true,
      sparkStatus: true,
      marketAnalysis: true,
      competitors: true,
      painPoints: true,
      positioning: true,
      sparkResult: true,
      marketSizing: true,
      project: { select: { id: true, title: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 15,
  });

  console.log(`Found ${researches.length} research records:\n`);

  researches.forEach((r, i) => {
    const dataFields = [
      r.marketAnalysis && 'market',
      r.competitors && 'competitors',
      r.painPoints && 'painPoints',
      r.positioning && 'positioning',
      r.sparkResult && 'sparkResult',
      r.marketSizing && 'marketSizing',
    ].filter(Boolean);

    console.log(`${i + 1}. [${r.status}] ${r.project.title.slice(0, 60)}...`);
    console.log(`   ID: ${r.id}`);
    console.log(`   Project ID: ${r.project.id}`);
    console.log(`   Phase: ${r.currentPhase}, Spark: ${r.sparkStatus || 'N/A'}`);
    console.log(`   Data: ${dataFields.length > 0 ? dataFields.join(', ') : 'NONE'}`);
    console.log();
  });
}

main().finally(() => prisma.$disconnect());
