import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Idea Fuel',
  description:
    'How Idea Fuel collects, uses, shares, and protects your data, plus how to exercise your rights.',
};

const LAST_UPDATED = 'April 16, 2026';
const CONTACT_EMAIL = 'privacy@ideafuel.ai';

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 text-[#e4e4e7]">
      <header className="mb-10 border-b border-[#333] pb-6">
        <h1 className="text-3xl font-semibold text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[#928e87]">Last updated: {LAST_UPDATED}</p>
      </header>

      <section className="space-y-4">
        <p>
          This Privacy Policy explains what information Idea Fuel
          (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;Idea Fuel&rdquo;) collects
          when you use our web and mobile apps, how we use it, who we share it
          with, and the choices and rights you have.
        </p>
        <p>
          We intentionally keep data collection minimal. We do not sell your
          personal information. We do not use your idea content to train AI
          models. If you delete your account, your data is deleted.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">1. Who this applies to</h2>
        <p>
          This policy covers visitors to ideafuel.ai, users of the app at
          app.ideafuel.ai, and users of the Idea Fuel iOS and Android
          applications. It does not cover third-party sites linked from Idea
          Fuel.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">2. What we collect</h2>
        <h3 className="mt-6 font-medium text-white">Account information</h3>
        <p>
          When you sign up with Google (or, on iOS, Apple), we receive your
          name, email address, and a profile image from your identity provider.
          We store these along with a unique Idea Fuel user id.
        </p>
        <h3 className="mt-6 font-medium text-white">Content you create</h3>
        <p>
          We store the ideas, notes, interviews, research, business plans, and
          any images you attach to projects or thoughts. You own this content.
          It is visible to you and, where you choose to share it, to people you
          invite. We do not use it to train AI models.
        </p>
        <h3 className="mt-6 font-medium text-white">Payment information</h3>
        <p>
          Subscription payments are processed by Stripe. On iOS, in-app
          purchases are processed by Apple via RevenueCat. We receive limited
          information from these providers (subscription tier, status, renewal
          date) but we do not store full card details.
        </p>
        <h3 className="mt-6 font-medium text-white">Technical data</h3>
        <p>
          We log standard server-side information when you use our app: IP
          address, browser/device user agent, request path, timestamps, and
          errors. We use this to debug issues, detect abuse, and improve
          performance.
        </p>
        <h3 className="mt-6 font-medium text-white">Analytics</h3>
        <p>
          On our website we use Google Analytics 4 and Meta Pixel to measure
          visitor behavior. These are only loaded after you consent (via the
          cookie banner). Neither fires on our mobile app.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">3. How we use your data</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>To provide the product: authenticate you, store your projects, generate AI research and reports.</li>
          <li>To operate the business: bill subscriptions, send transactional emails (password reset, subscription receipts, legally required notices).</li>
          <li>To keep the service safe: detect abuse, investigate security incidents, comply with law enforcement requests when legally required.</li>
          <li>To improve the product, in aggregate: e.g., which features get used, where errors happen. We do not use your idea content for this.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">4. Third-party services (sub-processors)</h2>
        <p>
          We use the following third-party services to run Idea Fuel. Each sees
          only the data needed to do its job.
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li><strong>Supabase</strong> (database + storage) — hosts your idea content and account.</li>
          <li><strong>Vercel</strong> (web hosting) — serves the app and landing site.</li>
          <li><strong>Railway</strong> (background workers) — runs AI research jobs.</li>
          <li><strong>Upstash</strong> (Redis) — queue coordination.</li>
          <li><strong>Stripe</strong> (payments) — web subscription payments.</li>
          <li><strong>RevenueCat + Apple In-App Purchase</strong> — iOS subscription payments.</li>
          <li><strong>Google Cloud Console</strong> — OAuth sign-in.</li>
          <li><strong>Apple</strong> — Sign in with Apple on iOS.</li>
          <li><strong>Anthropic (Claude), OpenAI (GPT), Google (Gemini), Perplexity</strong> — AI research and writing. Your prompts and any attached content are sent to these providers to generate responses. We do not allow them to train on your data. See each provider&rsquo;s policy for their own retention windows.</li>
          <li><strong>Brave Search, SerpAPI, DataForSEO</strong> — web search used during AI research.</li>
          <li><strong>Google Analytics 4, Meta Pixel</strong> — web analytics (consent-gated, web only).</li>
          <li><strong>Cloudflare Turnstile</strong> — bot protection on public forms.</li>
        </ul>
        <p>
          We sign data-processing agreements with providers that handle
          personal data on our behalf where such agreements are offered and
          required by law.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">5. Your rights</h2>
        <p>
          Depending on where you live (EU, UK, California, and many other
          jurisdictions), you have the following rights. You can exercise all
          of them directly from your account or by emailing{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-accent underline hover:no-underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li><strong>Access</strong> — download a copy of your data.</li>
          <li><strong>Correction</strong> — fix anything inaccurate in your profile.</li>
          <li><strong>Deletion</strong> — delete your account and all data. Use Settings &rarr; Delete Account in the app. This is permanent.</li>
          <li><strong>Portability</strong> — receive your data in a structured, machine-readable format (JSON export, coming soon; for now, email us).</li>
          <li><strong>Objection / restriction</strong> — object to certain uses or ask us to limit processing.</li>
          <li><strong>Withdrawal of consent</strong> — revoke cookie consent via the banner at any time.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">6. Data retention</h2>
        <p>
          We retain your account data for as long as your account is active.
          When you delete your account, we delete the data from our primary
          database immediately. Backups are retained for up to 30 days, after
          which residual copies are purged. Transactional logs (billing records
          required for tax and accounting) may be retained for up to 7 years
          as required by law.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">7. Security</h2>
        <p>
          We use industry-standard practices: TLS in transit, encrypted storage
          at rest, row-level security on user-owned data, and scoped API keys
          for third-party services. No system is perfectly secure; if you
          suspect a breach affecting your account, email us at{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-accent underline hover:no-underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">8. Children</h2>
        <p>
          Idea Fuel is not directed to children under 13, and we do not
          knowingly collect personal information from children under 13. If you
          believe a child has given us information, contact us and we will
          delete it.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">9. International transfers</h2>
        <p>
          Idea Fuel is operated from the United States. If you use Idea Fuel
          from outside the US, your data will be transferred to the US. Where
          required by law (e.g., for EU/UK users) we rely on Standard
          Contractual Clauses or equivalent safeguards for international
          transfers.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">10. Changes to this policy</h2>
        <p>
          We update this policy when our practices change. The date at the top
          reflects the most recent update. Material changes will be announced
          in-product before they take effect.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">11. Contact</h2>
        <p>
          Privacy questions, rights requests, or complaints:{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-accent underline hover:no-underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <p className="text-sm text-[#928e87]">
          This page is a draft prepared for legal review. Review with counsel
          before launch and update contact, entity, and jurisdiction details
          as needed.
        </p>
      </section>
    </article>
  );
}
