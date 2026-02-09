'use client';

import Script from 'next/script';
import { trpc } from '@/lib/trpc/client';

export function AnalyticsScripts() {
  const { data: analyticsEnabled } = trpc.admin.get.useQuery(
    { key: 'analytics.enabled' },
    { retry: false, refetchOnWindowFocus: false }
  );
  const { data: facebookPixelId } = trpc.admin.get.useQuery(
    { key: 'analytics.facebookPixelId' },
    { retry: false, refetchOnWindowFocus: false }
  );
  const { data: googleTagSnippet } = trpc.admin.get.useQuery(
    { key: 'analytics.googleTagSnippet' },
    { retry: false, refetchOnWindowFocus: false }
  );

  // Don't render if analytics is disabled
  if (!analyticsEnabled?.value) {
    return null;
  }

  const pixelId = facebookPixelId?.value as string | undefined;
  const gtagSnippet = googleTagSnippet?.value as string | undefined;

  return (
    <>
      {/* Facebook Pixel */}
      {pixelId && pixelId.length > 0 && (
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {/* Google Tag (gtag.js) */}
      {gtagSnippet && gtagSnippet.length > 0 && (
        <Script id="google-tag" strategy="afterInteractive">
          {gtagSnippet}
        </Script>
      )}
    </>
  );
}
