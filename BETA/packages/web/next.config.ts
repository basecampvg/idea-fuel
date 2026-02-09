import type { NextConfig } from 'next';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaPlugin } = require('@prisma/nextjs-monorepo-workaround-plugin');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@forge/shared', '@forge/server'],
  // Required for monorepo: tells Next.js to trace files from the monorepo root
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Force-include Prisma engine binaries that file tracing misses in pnpm monorepos.
  // The copy-prisma-engines.js build script copies the engine to .prisma/client/
  // and this config ensures it's included in the Vercel serverless function bundle.
  outputFileTracingIncludes: {
    '/*': ['.prisma/client/**'],
  },
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
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
};

export default nextConfig;
