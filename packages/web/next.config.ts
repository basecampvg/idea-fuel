import type { NextConfig } from 'next';
import path from 'path';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  transpilePackages: ['@forge/shared', '@forge/server'],
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-placeholder',
    ],
  },
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
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.fbcdn.net' },
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
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

export default withBundleAnalyzer(nextConfig);
