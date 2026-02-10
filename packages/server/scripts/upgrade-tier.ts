import { db } from '../src/db/drizzle';
import { users } from '../src/db/schema';

async function main() {
  const allUsers = await db.query.users.findMany({
    columns: { id: true, email: true, subscription: true }
  });
  console.log('Current users:', JSON.stringify(allUsers, null, 2));

  // Update all users to ENTERPRISE for testing
  const updated = await db.update(users).set({ subscription: 'ENTERPRISE' }).returning({
    id: users.id,
    email: users.email,
    subscription: users.subscription,
  });
  console.log('Updated', updated.length, 'users to ENTERPRISE tier');
  console.log('After update:', JSON.stringify(updated, null, 2));
}

main().catch(console.error);
