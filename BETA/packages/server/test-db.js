const { PrismaClient } = require('@prisma/client');

// Manually set DATABASE_URL since dotenv isn't available
process.env.DATABASE_URL = "postgresql://postgres.wvacfynzguprqlzyukzx:9-tUgfyzQTSR%L3@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true";

const prisma = new PrismaClient();

async function test() {
  console.log('Testing database connection...');

  const start = Date.now();
  try {
    await prisma.$connect();
    console.log('Connected in', Date.now() - start, 'ms');

    const users = await prisma.user.findMany({ take: 1 });
    console.log('Users found:', users.length);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
    console.log('Disconnected');
  }
}

test();
