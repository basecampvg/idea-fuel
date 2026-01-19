const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './.env' });

const prisma = new PrismaClient();

async function test() {
  console.log('Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (' + process.env.DATABASE_URL.substring(0, 30) + '...)' : 'Not set');

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
