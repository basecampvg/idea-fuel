/**
 * List research records to find one with data
 */
import { db } from '../db/drizzle';
import { desc } from 'drizzle-orm';
import { research } from '../db/schema';

async function main() {
  const records = await db.query.research.findMany({
    columns: {
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
    },
    with: {
      project: { columns: { id: true, title: true } },
    },
    orderBy: desc(research.updatedAt),
    limit: 15,
  });

  console.log(`Found ${records.length} research records:\n`);

  records.forEach((r, i) => {
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

main().catch(console.error);
