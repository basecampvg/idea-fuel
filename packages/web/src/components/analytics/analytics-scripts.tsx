import Script from 'next/script';
import { db, schema } from '@forge/server';
import { eq, and } from 'drizzle-orm';

async function getAnalyticsConfig() {
  try {
    const rows = await db
      .select({ key: schema.adminConfigs.key, value: schema.adminConfigs.value })
      .from(schema.adminConfigs)
      .where(
        and(
          eq(schema.adminConfigs.category, 'analytics'),
        ),
      );

    const configMap = new Map(rows.map((r) => [r.key, r.value]));

    return {
      enabled: configMap.get('analytics.enabled') === true,
      facebookPixelId: (configMap.get('analytics.facebookPixelId') as string) || null,
      googleTagSnippet: (configMap.get('analytics.googleTagSnippet') as string) || null,
    };
  } catch {
    return { enabled: false, facebookPixelId: null, googleTagSnippet: null };
  }
}

export async function AnalyticsScripts() {
  const { enabled, facebookPixelId, googleTagSnippet } = await getAnalyticsConfig();

  if (!enabled) {
    return null;
  }

  return (
    <>
      {/* Meta Pixel — beforeInteractive injects into <head> at SSR time */}
      {facebookPixelId && facebookPixelId.length > 0 && (
        <>
          <Script id="facebook-pixel" strategy="beforeInteractive">
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
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${facebookPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
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
