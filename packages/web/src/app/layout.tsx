import type { Metadata, Viewport } from 'next';
import { Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { SessionProvider } from 'next-auth/react';
import { TRPCProvider } from '@/lib/trpc/provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { ConsentBanner } from '@/components/consent-banner';
import './globals.css';

const sfPro = localFont({
  src: [
    { path: '../../public/fonts/SF-Pro-Text-Light.otf', weight: '300', style: 'normal' },
    { path: '../../public/fonts/SF-Pro-Text-Regular.otf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/SF-Pro-Text-Medium.otf', weight: '500', style: 'normal' },
    { path: '../../public/fonts/SF-Pro-Text-Semibold.otf', weight: '600', style: 'normal' },
    { path: '../../public/fonts/SF-Pro-Text-Bold.otf', weight: '700', style: 'normal' },
    { path: '../../public/fonts/SF-Pro-Display-Regular.otf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/SF-Pro-Display-Medium.otf', weight: '500', style: 'normal' },
    { path: '../../public/fonts/SF-Pro-Display-Semibold.otf', weight: '600', style: 'normal' },
    { path: '../../public/fonts/SF-Pro-Display-Bold.otf', weight: '700', style: 'normal' },
    { path: '../../public/fonts/SF-Pro-Display-Heavy.otf', weight: '800', style: 'normal' },
    { path: '../../public/fonts/SF-Pro-Display-Black.otf', weight: '900', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

const sfProDisplay = localFont({
  src: [
    { path: '../../public/fonts/SF-Pro-Display-Bold.otf', weight: '700', style: 'normal' },
    { path: '../../public/fonts/SF-Pro-Display-Heavy.otf', weight: '800', style: 'normal' },
    { path: '../../public/fonts/SF-Pro-Display-Black.otf', weight: '900', style: 'normal' },
  ],
  variable: '--font-display',
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
    default: 'Idea Fuel',
    template: '%s | Idea Fuel',
  },
  description: 'AI-powered business validation platform',
  openGraph: {
    title: 'Idea Fuel',
    description: 'AI-powered business validation platform',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Idea Fuel',
    description: 'AI-powered business validation platform',
  },
  icons: {
    icon: '/ideafuel-logo.svg',
    apple: '/ideafuel-logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sfPro.variable} ${sfProDisplay.variable} ${geistMono.variable}`}>
      <head />
      {/* Analytics (GA4 + Meta Pixel) moved to <ConsentBanner /> below —
          nothing loads until the user accepts. Figma capture.js removed
          (was "temporary", shipping to real users, CSP-blocked anyway). */}
      <body className="antialiased" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://ideafuel.ai/#organization',
                  name: 'Idea Fuel',
                  url: 'https://ideafuel.ai',
                  logo: {
                    '@type': 'ImageObject',
                    url: 'https://ideafuel.ai/ideafuel-logo.svg',
                  },
                  description: 'AI-powered business validation platform',
                  sameAs: [],
                },
                {
                  '@type': 'WebSite',
                  '@id': 'https://ideafuel.ai/#website',
                  url: 'https://ideafuel.ai',
                  name: 'Idea Fuel',
                  publisher: { '@id': 'https://ideafuel.ai/#organization' },
                },
              ],
            }),
          }}
        />
        <ThemeProvider>
          <SessionProvider>
            <TRPCProvider>
              {children}
            </TRPCProvider>
          </SessionProvider>
        </ThemeProvider>
        <ConsentBanner />
      </body>
    </html>
  );
}
