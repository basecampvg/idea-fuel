import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { TRPCProvider } from '@/lib/trpc/provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AnalyticsScripts } from '@/components/analytics/analytics-scripts';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#d9d9d9' },
    { media: '(prefers-color-scheme: dark)', color: '#11100E' },
  ],
};

export const metadata: Metadata = {
  title: {
    default: 'ideationLab',
    template: '%s | ideationLab',
  },
  description: 'AI-powered business validation platform',
  openGraph: {
    title: 'ideationLab',
    description: 'AI-powered business validation platform',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ideationLab',
    description: 'AI-powered business validation platform',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <SessionProvider>
            <TRPCProvider>
              {children}
              <AnalyticsScripts />
            </TRPCProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
