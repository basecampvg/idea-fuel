import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@forge/shared', '@forge/server'],
  // Required for monorepo: tells Next.js to trace files from the monorepo root
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Include Prisma WASM query compiler in Vercel serverless functions.
  // The generated client lives in packages/server but at runtime Prisma's
  // __dirname fallback resolves to process.cwd()+src/generated/prisma/ which
  // is packages/web/src/generated/prisma/ on Vercel. The vercel-build script
  // copies schema.prisma + query_compiler_bg.wasm there; this config ensures
  // they survive output file tracing into the deployment bundle.
  outputFileTracingIncludes: {
    '/**': ['./src/generated/prisma/**/*'],
  },
  // Externalize Prisma packages to prevent webpack from bundling engine/WASM
  // resolution code. All @prisma/* packages are direct deps of @forge/web so
  // Node.js can resolve them at runtime via node_modules.
  serverExternalPackages: [
    '@prisma/client',
    '.prisma/client',
    '@prisma/adapter-pg',
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
      // Force-externalize all @prisma/* and .prisma/* packages.
      // serverExternalPackages alone isn't sufficient because @forge/server
      // is in transpilePackages, which causes webpack to follow imports.
      // All these packages are direct deps of @forge/web, so require() works.
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        /^@prisma\//,
        /^\.prisma\//,
      ];
    }
    return config;
  },
  async redirects() {
    return [
      {
        source: '/ideas',
        destination: '/projects',
        permanent: true,
      },
      {
        source: '/ideas/:path*',
        destination: '/projects/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
