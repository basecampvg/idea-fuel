import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@forge/shared', '@forge/server'],
  // Required for monorepo: tells Next.js to trace files from the monorepo root
  outputFileTracingRoot: path.join(__dirname, '../../'),
  serverExternalPackages: [
    'postgres',
    'drizzle-orm',
    '@auth/drizzle-adapter',
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
