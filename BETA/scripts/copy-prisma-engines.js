/**
 * Copies Prisma query engine binaries from the pnpm store to packages/web/.prisma/client/
 * so Vercel serverless functions can find them at runtime.
 *
 * This is a fallback for pnpm monorepos where Next.js file tracing
 * can't follow the deeply nested pnpm store paths.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pnpmDir = path.join(root, 'node_modules', '.pnpm');
const targetDir = path.join(root, 'packages', 'web', '.prisma', 'client');

fs.mkdirSync(targetDir, { recursive: true });

let copied = 0;

try {
  const entries = fs.readdirSync(pnpmDir);
  for (const entry of entries) {
    if (!entry.startsWith('@prisma+client@')) continue;

    const prismaDir = path.join(pnpmDir, entry, 'node_modules', '.prisma', 'client');
    if (!fs.existsSync(prismaDir)) continue;

    const files = fs.readdirSync(prismaDir);
    for (const file of files) {
      if (file.includes('query_engine') && file.endsWith('.node')) {
        fs.copyFileSync(path.join(prismaDir, file), path.join(targetDir, file));
        console.log(`Copied: ${file}`);
        copied++;
      }
    }
  }
} catch (e) {
  console.error('Warning: Could not copy Prisma engines:', e.message);
}

if (copied === 0) {
  console.log('No Prisma engine files found to copy (this is OK if PrismaPlugin handles it)');
} else {
  console.log(`Copied ${copied} engine file(s) to packages/web/.prisma/client/`);
}
