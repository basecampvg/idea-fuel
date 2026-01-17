import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import { TRPCProvider } from '@/lib/trpc/provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Forge Automation',
  description: 'AI-powered business automation platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        <SessionProvider>
          <TRPCProvider>{children}</TRPCProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
