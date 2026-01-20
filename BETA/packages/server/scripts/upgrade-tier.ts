import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, subscription: true }
  });
  console.log('Current users:', JSON.stringify(users, null, 2));

  // Update all users to ENTERPRISE for testing
  const result = await prisma.user.updateMany({
    data: { subscription: 'ENTERPRISE' }
  });
  console.log('Updated', result.count, 'users to ENTERPRISE tier');

  const updated = await prisma.user.findMany({
    select: { id: true, email: true, subscription: true }
  });
  console.log('After update:', JSON.stringify(updated, null, 2));
}

main()
  .finally(() => prisma.$disconnect());
