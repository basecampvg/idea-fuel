import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@forge/shared', '@forge/server'],
  // Required for monorepo: tells Next.js to trace files from the monorepo root
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Externalize @react-pdf packages so they use Node.js resolution (React 18)
  // instead of webpack bundling (which would use Next.js's React 19)
  // NOTE: reconciler MUST be included - without it, React 19 internals break PDF rendering
  serverExternalPackages: [
    '@react-pdf/renderer',
    '@react-pdf/reconciler',
    '@react-pdf/layout',
    '@react-pdf/font',
    '@react-pdf/pdfkit',
    '@react-pdf/primitives',
    '@react-pdf/fns',
    '@react-pdf/textkit',
    '@react-pdf/stylesheet',
    '@react-pdf/types',
    '@prisma/client',
    '.prisma/client',
  ],
};

export default nextConfig;
