'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useState, useCallback } from 'react';

/**
 * GDPR / ePrivacy / CCPA-aware consent banner.
 *
 * Consent is stored in localStorage as a JSON blob with shape:
 *   { analytics: boolean, ts: number, v: 1 }
 *
 * Before consent is granted: neither Meta Pixel nor Google Analytics
 * are loaded. The gtag stub is installed with Consent Mode v2 defaulted
 * to "denied" so Google Tag Manager consumers (if added later) behave.
 *
 * On accept: consent is recorded, Google Consent Mode is updated to
 * "granted", and the GA4 + Meta Pixel <Script> tags mount (via state).
 *
 * On reject: consent is recorded as analytics=false. Neither pixel
 * loads. User can re-open the banner from the Settings area (future
 * work — out of launch scope).
 */

const STORAGE_KEY = 'idea_fuel_consent';
const CONSENT_VERSION = 1;

type ConsentState = {
  analytics: boolean;
  ts: number;
  v: number;
};

function readConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed.v !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(analytics: boolean) {
  if (typeof window === 'undefined') return;
  const state: ConsentState = {
    analytics,
    ts: Date.now(),
    v: CONSENT_VERSION,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded or disabled storage — fall through */
  }
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
    dataLayer?: unknown[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq?: (...args: any[]) => void;
  }
}

export function ConsentBanner() {
  // `null` = still checking storage, `true`/`false` = resolved consent,
  // `undefined` = no stored decision (show banner).
  const [analyticsConsent, setAnalyticsConsent] = useState<
    boolean | null | undefined
  >(null);

  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const isProd = process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';

  useEffect(() => {
    const stored = readConsent();
    setAnalyticsConsent(stored ? stored.analytics : undefined);
  }, []);

  // Notify GA Consent Mode whenever analytics consent becomes `true`.
  useEffect(() => {
    if (analyticsConsent === true && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: 'granted',
        analytics_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      });
    }
  }, [analyticsConsent]);

  const accept = useCallback(() => {
    writeConsent(true);
    setAnalyticsConsent(true);
  }, []);

  const reject = useCallback(() => {
    writeConsent(false);
    setAnalyticsConsent(false);
  }, []);

  // Don't render anything analytics-related outside production — preview
  // and dev builds should never fire pixels.
  const shouldLoadAnalytics =
    isProd && analyticsConsent === true;

  return (
    <>
      {/* Google Consent Mode defaults — must run before any gtag config */}
      <Script
        id="google-consent-default"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('consent', 'default', {
              ad_storage: 'denied',
              analytics_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              wait_for_update: 500,
            });
          `,
        }}
      />

      {shouldLoadAnalytics && gaMeasurementId && (
        <>
          <Script
            id="ga4-loader"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
          />
          <Script
            id="ga4-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}');
              `,
            }}
          />
        </>
      )}

      {shouldLoadAnalytics && metaPixelId && (
        <>
          <Script
            id="meta-pixel-loader"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${metaPixelId}');
                fbq('track', 'PageView');
              `,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {analyticsConsent === undefined && (
        <div
          role="dialog"
          aria-labelledby="consent-heading"
          aria-describedby="consent-desc"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-xl border border-[#333] bg-[#0A0A0A]/95 p-4 shadow-2xl backdrop-blur md:p-5"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
            <div className="flex-1">
              <p id="consent-heading" className="text-sm font-medium text-white">
                Cookies and analytics
              </p>
              <p id="consent-desc" className="mt-1 text-sm text-[#928e87]">
                We use cookies for essential functionality and, with your
                consent, analytics that help us improve the product (Google
                Analytics, Meta Pixel). No tracking fires until you choose.{' '}
                <Link
                  href="/privacy"
                  className="underline underline-offset-2 hover:text-white"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <button
                type="button"
                onClick={reject}
                className="rounded-full border border-[#444] px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/60 hover:text-white"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={accept}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
