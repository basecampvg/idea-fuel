import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Geist, Geist_Mono, Outfit } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { TRPCProvider } from '@/lib/trpc/provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
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

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['800', '900'],
  variable: '--font-display',
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable} ${outfit.variable}`}>
      <head>
        <Script id="fb-pixel" strategy="beforeInteractive">{`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '2377129659366978');
fbq('track', 'PageView');
        `}</Script>
        <noscript>
          <img height="1" width="1" style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=2377129659366978&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <SessionProvider>
            <TRPCProvider>
              {children}
            </TRPCProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
