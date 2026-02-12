'use client';

import Script from 'next/script';
import { trpc } from '@/lib/trpc/client';

export function AnalyticsScripts() {
  const { data } = trpc.admin.analyticsConfig.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  if (!data?.enabled) {
    return null;
  }

  const { facebookPixelId, googleTagSnippet } = data;

  return (
    <>
      {/* Facebook Pixel */}
      {facebookPixelId && facebookPixelId.length > 0 && (
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
            fbq('init', '${facebookPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {/* Google Tag (gtag.js) */}
      {googleTagSnippet && googleTagSnippet.length > 0 && (
        <Script id="google-tag" strategy="afterInteractive">
          {googleTagSnippet}
        </Script>
      )}
    </>
  );
}
