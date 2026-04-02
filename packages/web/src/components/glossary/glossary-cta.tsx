import { Button } from '@/components/ui/button';

const appUrl =
  process.env.NEXT_PUBLIC_APP_SUBDOMAIN
    ? `https://${process.env.NEXT_PUBLIC_APP_SUBDOMAIN}`
    : process.env.NEXT_PUBLIC_APP_URL ?? '/dashboard';

export function GlossaryCta() {
  return (
    <div className="rounded-2xl border border-[#222] bg-[#1c1b19] px-8 py-10 text-center">
      <h3 className="font-display text-2xl font-extrabold text-white">
        Ready to validate your idea?
      </h3>
      <p className="mx-auto mt-3 max-w-md text-[15px] text-[#928e87]">
        IdeaFuel uses AI to research your market, interview potential customers, and build financial models — so you can launch with confidence.
      </p>
      <a href={appUrl} className="mt-6 inline-block">
        <Button size="lg" variant="accent">
          Get Started Free
        </Button>
      </a>
    </div>
  );
}
