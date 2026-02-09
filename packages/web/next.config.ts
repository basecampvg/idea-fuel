import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@forge/shared', '@forge/server'],
  // Required for monorepo: tells Next.js to trace files from the monorepo root
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Externalize packages that break when processed by webpack:
  // - Prisma: engine binary resolution fails when bundled (monorepo + Vercel)
  // - @react-pdf: needs React 18 Node.js resolution, not webpack's React 19
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
      // Force-externalize Prisma to prevent webpack from bundling engine resolution code.
      // serverExternalPackages alone isn't sufficient because @forge/server is in
      // transpilePackages, which causes webpack to follow imports into @prisma/*.
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
