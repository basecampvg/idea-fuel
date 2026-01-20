import { PrismaClient } from '@prisma/client';
import { configService } from '../src/services/config';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding admin configuration...\n');

  // Initialize config service
  await configService.init(prisma);

  // Seed defaults
  const seeded = await configService.seedDefaults();

  if (seeded > 0) {
    console.log(`\nSuccessfully seeded ${seeded} configuration values.`);
  } else {
    console.log('\nAll configuration values already exist.');
  }

  // Show current configs
  const configs = await configService.getAllByCategory();
  console.log('\nCurrent configuration by category:\n');

  for (const [category, items] of Object.entries(configs)) {
    console.log(`[${category.toUpperCase()}]`);
    for (const item of items) {
      const value = typeof item.value === 'object'
        ? JSON.stringify(item.value).substring(0, 50) + '...'
        : item.value;
      console.log(`  ${item.key}: ${value}`);
    }
    console.log('');
  }
}

main()
  .catch((e) => {
    console.error('Error seeding config:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
