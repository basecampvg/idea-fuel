/**
 * Copies Prisma query engine binaries to packages/web/.prisma/client/
 * so Vercel serverless functions can find them at runtime.
 *
 * Prisma searches /var/task/packages/web/.prisma/client/ at runtime.
 * Next.js outputFileTracingIncludes ensures the copied files are bundled.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const targetDir = path.join(root, 'packages', 'web', '.prisma', 'client');

fs.mkdirSync(targetDir, { recursive: true });

let copied = 0;

// Strategy 1: Use require.resolve to find @prisma/client, then navigate to .prisma/client
try {
  // Resolve from the server package where @prisma/client is a dependency
  const serverDir = path.join(root, 'packages', 'server');
  const prismaClientPkg = require.resolve('@prisma/client/package.json', { paths: [serverDir] });
  const prismaClientDir = path.dirname(prismaClientPkg);
  // .prisma/client is two levels up from @prisma/client in pnpm store
  const engineDir = path.join(prismaClientDir, '..', '..', '.prisma', 'client');

  console.log(`[prisma-engine] @prisma/client found at: ${prismaClientDir}`);
  console.log(`[prisma-engine] Engine dir: ${engineDir}`);
  console.log(`[prisma-engine] Engine dir exists: ${fs.existsSync(engineDir)}`);

  if (fs.existsSync(engineDir)) {
    const files = fs.readdirSync(engineDir);
    console.log(`[prisma-engine] Files in engine dir: ${files.filter(f => f.includes('engine')).join(', ')}`);

    for (const file of files) {
      // Copy engine binaries (.node files) and WASM engine
      if ((file.includes('query_engine') && file.endsWith('.node')) ||
          (file.includes('query_engine') && file.endsWith('.wasm'))) {
        // Skip .tmp files
        if (file.includes('.tmp')) continue;

        const src = path.join(engineDir, file);
        const dest = path.join(targetDir, file);
        fs.copyFileSync(src, dest);
        console.log(`[prisma-engine] Copied: ${file}`);
        copied++;
      }
    }
    // Also copy schema.prisma if present (some Prisma versions need it)
    const schemaInEngine = path.join(engineDir, 'schema.prisma');
    if (fs.existsSync(schemaInEngine)) {
      fs.copyFileSync(schemaInEngine, path.join(targetDir, 'schema.prisma'));
      console.log('[prisma-engine] Copied: schema.prisma');
    }
  }
} catch (e) {
  console.log(`[prisma-engine] Strategy 1 (require.resolve) failed: ${e.message}`);
}

// Strategy 2: Fallback - scan pnpm store directly
if (copied === 0) {
  console.log('[prisma-engine] Trying Strategy 2: pnpm store scan...');
  try {
    const pnpmDir = path.join(root, 'node_modules', '.pnpm');
    const entries = fs.readdirSync(pnpmDir);
    for (const entry of entries) {
      if (!entry.startsWith('@prisma+client@')) continue;

      const prismaDir = path.join(pnpmDir, entry, 'node_modules', '.prisma', 'client');
      if (!fs.existsSync(prismaDir)) continue;

      console.log(`[prisma-engine] Found .prisma/client in: ${entry}`);
      const files = fs.readdirSync(prismaDir);
      for (const file of files) {
        if (file.includes('query_engine') && (file.endsWith('.node') || file.endsWith('.wasm'))) {
          if (file.includes('.tmp')) continue;
          fs.copyFileSync(path.join(prismaDir, file), path.join(targetDir, file));
          console.log(`[prisma-engine] Copied: ${file}`);
          copied++;
        }
      }
    }
  } catch (e) {
    console.error(`[prisma-engine] Strategy 2 failed: ${e.message}`);
  }
}

// Report results
console.log(`[prisma-engine] Target dir: ${targetDir}`);
if (copied === 0) {
  console.error('[prisma-engine] WARNING: No engine files copied! Prisma will fail at runtime.');
  // List what's in the target dir anyway
  if (fs.existsSync(targetDir)) {
    console.log(`[prisma-engine] Target dir contents: ${fs.readdirSync(targetDir).join(', ') || '(empty)'}`);
  }
} else {
  console.log(`[prisma-engine] Success: ${copied} engine file(s) copied`);
  console.log(`[prisma-engine] Target dir contents: ${fs.readdirSync(targetDir).join(', ')}`);
}
