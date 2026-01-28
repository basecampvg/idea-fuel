import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ideas = await prisma.idea.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 10,
    include: {
      research: {
        select: {
          id: true,
          status: true,
          marketAnalysis: true,
          sparkResult: true,
        },
      },
    },
  });

  console.log('Recent ideas:\n');
  ideas.forEach((idea, idx) => {
    console.log(`${idx + 1}. ${idea.title.slice(0, 60)}`);
    console.log(`   ID: ${idea.id}`);
    console.log(`   Status: ${idea.status}`);
    if (idea.research) {
      const hasMarket = !!idea.research.marketAnalysis;
      const hasSpark = !!idea.research.sparkResult;
      console.log(`   Research: ${idea.research.status} (market: ${hasMarket}, spark: ${hasSpark})`);
    } else {
      console.log(`   Research: NONE`);
    }
    console.log();
  });
}

main().finally(() => prisma.$disconnect());
