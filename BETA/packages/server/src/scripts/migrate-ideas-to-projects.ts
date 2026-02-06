/**
 * Data Migration: Wrap existing ideas in projects
 *
 * For each Idea that has no projectId, creates a parent Project
 * using the idea's title/description, then links the idea to it.
 *
 * Safe to run multiple times — skips ideas that already have a project.
 *
 * Usage:
 *   npx tsx src/scripts/migrate-ideas-to-projects.ts
 *   npx tsx src/scripts/migrate-ideas-to-projects.ts --dry-run
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  if (DRY_RUN) {
    console.log('[DRY RUN] No changes will be written.\n');
  }

  // Find all ideas without a project
  const orphanedIdeas = await prisma.idea.findMany({
    where: { projectId: null },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      title: true,
      description: true,
      userId: true,
      createdAt: true,
    },
  });

  console.log(`Found ${orphanedIdeas.length} idea(s) without a project.\n`);

  if (orphanedIdeas.length === 0) {
    console.log('Nothing to migrate.');
    return;
  }

  let migrated = 0;
  let failed = 0;

  for (const idea of orphanedIdeas) {
    try {
      console.log(`Migrating: "${idea.title.slice(0, 60)}" (${idea.id})`);

      if (DRY_RUN) {
        console.log(`  [DRY RUN] Would create project and link idea.\n`);
        migrated++;
        continue;
      }

      // Create project and link idea in a transaction
      await prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: {
            title: idea.title,
            description: idea.description,
            userId: idea.userId,
            canvas: [],
          },
        });

        await tx.idea.update({
          where: { id: idea.id },
          data: { projectId: project.id },
        });

        console.log(`  Created project ${project.id} → linked idea ${idea.id}\n`);
      });

      migrated++;
    } catch (error) {
      failed++;
      console.error(`  FAILED: ${error instanceof Error ? error.message : error}\n`);
    }
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${failed} failed.`);
}

main().finally(() => prisma.$disconnect());
