import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/auth/',
        '/dashboard/',
        '/projects/',
        '/reports/',
        '/settings/',
        '/plans/',
        '/daily-pick/',
        '/admin/',
        '/_next/',
      ],
    },
    sitemap: 'https://ideafuel.ai/sitemap.xml',
  };
}
