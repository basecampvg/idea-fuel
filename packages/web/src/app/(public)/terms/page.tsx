import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Idea Fuel',
  description:
    'The agreement governing your use of Idea Fuel, including acceptable use, billing, and liability.',
};

const LAST_UPDATED = 'April 16, 2026';
const CONTACT_EMAIL = 'legal@ideafuel.ai';

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 text-[#e4e4e7]">
      <header className="mb-10 border-b border-[#333] pb-6">
        <h1 className="text-3xl font-semibold text-white">Terms of Service</h1>
        <p className="mt-2 text-sm text-[#928e87]">Last updated: {LAST_UPDATED}</p>
      </header>

      <section className="space-y-4">
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) form a binding agreement
          between you and Idea Fuel (&ldquo;we,&rdquo; &ldquo;us&rdquo;). By
          using Idea Fuel you agree to these Terms. If you don&rsquo;t agree,
          stop using the service.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">1. The service</h2>
        <p>
          Idea Fuel is an AI-powered platform for validating, researching,
          interviewing customers about, and planning businesses. Features
          include idea capture, deep research, interview simulation, business
          plan generation, and financial modeling. We may change, add, or
          remove features over time.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">2. Your account</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>You must be at least 13 years old to use Idea Fuel.</li>
          <li>You are responsible for activity under your account. Keep your sign-in method secure.</li>
          <li>One person, one account. Don&rsquo;t share your login.</li>
          <li>You can delete your account at any time from Settings.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">3. Content ownership</h2>
        <p>
          You own the ideas, notes, interviews, and business plans you create
          with Idea Fuel. We claim no ownership of your content.
        </p>
        <p>
          By using the service, you grant us a limited, non-exclusive license
          to store, process, and display your content solely to operate the
          service for you (e.g., saving it to our database, feeding it to AI
          providers so they can generate responses, displaying it back to you
          in the app). This license ends when you delete the content or your
          account.
        </p>
        <p>
          We do not use your content to train AI models, and we contractually
          require our AI sub-processors not to train on your content where
          such contracts are available.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">4. Acceptable use</h2>
        <p>
          Don&rsquo;t do any of the following with Idea Fuel:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Break the law.</li>
          <li>Infringe someone else&rsquo;s intellectual property.</li>
          <li>Use the service to produce or spread content that is hateful, harassing, or dehumanizing.</li>
          <li>Attempt to reverse-engineer, scrape, or resell the service.</li>
          <li>Upload malware, worms, or anything intended to disrupt the service or other users.</li>
          <li>Use our AI features to generate content that violates the policies of our AI sub-processors (Anthropic, OpenAI, Google, Perplexity).</li>
          <li>Abuse free-tier quotas via automation, account farming, or circumvention of rate limits.</li>
        </ul>
        <p>
          We can suspend or terminate accounts that violate these rules. We
          may also pause paid AI features if your usage pattern triggers
          fraud or abuse alerts; in that case, we&rsquo;ll contact you before
          taking final action when feasible.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">5. Subscriptions and billing</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Paid plans are billed in advance on a recurring basis (monthly or annual) until you cancel.</li>
          <li>You can cancel any time from the billing portal; access continues until the end of the current billing period. Canceling does not refund partial periods.</li>
          <li>Refunds are at our discretion and typically granted only for accidental charges, service outages longer than a day, or where required by law.</li>
          <li>Prices are in USD unless otherwise stated. We may change prices with at least 30 days&rsquo; notice before your next renewal.</li>
          <li>On iOS, subscriptions purchased through the App Store follow Apple&rsquo;s terms and are managed in Apple&rsquo;s Settings; we can&rsquo;t directly refund App Store transactions.</li>
          <li>Pay-as-you-go credits, where offered, are non-refundable except where required by law.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">6. AI-generated content</h2>
        <p>
          Idea Fuel uses large language models (Claude, GPT, Gemini, others)
          to generate research, business plans, and similar content. AI
          output may be wrong, misleading, or incomplete. Do not rely on AI
          output for legal, medical, financial, or other expert advice
          without independent verification.
        </p>
        <p>
          You are responsible for reviewing and deciding what to do with AI
          output. We are not liable for decisions you make based on it.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">7. Third-party services</h2>
        <p>
          Idea Fuel integrates with third parties (Stripe, Apple, Google,
          AI providers, analytics). Your use of those services is governed
          by their own terms. We don&rsquo;t control their behavior and
          aren&rsquo;t responsible for their outages, pricing, or changes to
          their APIs.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">8. Changes and termination</h2>
        <p>
          We can change these Terms. Material changes will be announced
          in-app before taking effect. If you continue using Idea Fuel after
          a change, you agree to the updated Terms.
        </p>
        <p>
          You can stop using Idea Fuel at any time by deleting your account.
          We can suspend or terminate your account for violations of these
          Terms or in response to law-enforcement or legal requirements.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">9. Disclaimers</h2>
        <p>
          Idea Fuel is provided &ldquo;as is,&rdquo; without warranties of
          any kind. We do not guarantee that the service will be uninterrupted,
          error-free, or that AI output will be accurate. You use Idea Fuel
          at your own risk.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">10. Limitation of liability</h2>
        <p>
          To the maximum extent allowed by law, our liability arising out of
          or related to your use of Idea Fuel is limited to the greater of
          (a) the amount you paid us in the 12 months before the event giving
          rise to the claim, or (b) $100. We are not liable for indirect,
          consequential, or punitive damages. Some jurisdictions don&rsquo;t
          allow this limitation; it applies to you only to the extent law
          allows.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">11. Governing law</h2>
        <p>
          These Terms are governed by the laws of the State of [STATE], USA,
          without regard to its conflict-of-law rules. Disputes go to the
          state and federal courts located in [COUNTY], [STATE].
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-white">12. Contact</h2>
        <p>
          Questions about these Terms:{' '}
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
          before launch. Fill in [STATE] and [COUNTY], update contact and
          entity details, and confirm the arbitration / venue clauses fit
          your target market.
        </p>
      </section>
    </article>
  );
}
