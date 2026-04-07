/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://ideafuel.ai',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      {
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
    ],
    additionalSitemaps: [],
    transformRobotsTxt: async (_, robotsTxt) =>
      `${robotsTxt}\n# AI/Agent discovery\n# See https://ideafuel.ai/llms.txt for AI-readable documentation\n`,
  },
  exclude: [
    '/api/*',
    '/auth/*',
    '/dashboard',
    '/projects/*',
    '/reports/*',
    '/settings',
    '/plans/*',
    '/daily-pick/*',
    '/admin/*',
    '/design-system',
    '/print/*',
    '/i/*',
    '/icon.svg',
  ],
  additionalPaths: async () => [
    { loc: '/llms.txt', lastmod: new Date().toISOString(), priority: 0.3, changefreq: 'monthly' },
    { loc: '/llms-full.txt', lastmod: new Date().toISOString(), priority: 0.3, changefreq: 'monthly' },
  ],
};
