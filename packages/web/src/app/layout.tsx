import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { TRPCProvider } from '@/lib/trpc/provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AnalyticsScripts } from '@/components/analytics/analytics-scripts';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8f5' },
    { media: '(prefers-color-scheme: dark)', color: '#121211' },
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
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable}`}>
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
