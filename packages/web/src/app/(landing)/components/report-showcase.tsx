'use client';

import {
  TrendingUp,
  ShieldAlert,
  Shield,
  ShieldCheck,
  Clock,
  BarChart3,
  Target,
  AlertCircle,
  Zap,
  MessageCircle,
  ThumbsUp,
  MessageSquare,
  ArrowUpRight,
  Server,
  Layers,
  CheckCircle2,
  Signal,
  BookOpen,
} from 'lucide-react';
import { useInView } from './use-in-view';

/* ── Score cards data ── */
const scores = [
  { label: 'Opportunity', value: 82, color: 'bg-success' },
  { label: 'Problem', value: 76, color: 'bg-[hsl(350,80%,60%)]' },
  { label: 'Feasibility', value: 71, color: 'bg-accent' },
  { label: 'Why Now', value: 88, color: 'bg-[hsl(260,60%,55%)]' },
];

/* ── Market sizing data ── */
const marketCards = [
  { label: 'TAM', fullLabel: 'Total Addressable Market', value: '$4.8B', growth: '+12.3%' },
  { label: 'SAM', fullLabel: 'Serviceable Available Market', value: '$1.2B', growth: '+14.1%' },
  { label: 'SOM', fullLabel: 'Serviceable Obtainable Market', value: '$180M', growth: '+18.7%' },
];

/* ── Competitors data ── */
const competitors = [
  {
    name: 'Little Hotelier',
    type: 'Incumbent',
    threat: 'high' as const,
    strengths: ['Large install base', 'Brand recognition'],
    weaknesses: ['Dated UX', 'Slow feature releases'],
  },
  {
    name: 'Guesty',
    type: 'Challenger',
    threat: 'medium' as const,
    strengths: ['VC-funded', 'Modern platform'],
    weaknesses: ['Enterprise pricing', 'Not B&B-focused'],
  },
  {
    name: 'Lodgify',
    type: 'Niche',
    threat: 'medium' as const,
    strengths: ['Website builder included', 'Booking engine'],
    weaknesses: ['Limited CRM features', 'No AI capabilities'],
  },
];

/* ── Pain points data ── */
const painPoints = [
  {
    problem: 'Managing guest communication across multiple channels (email, OTAs, phone)',
    severity: 'high' as const,
    currentSolutions: ['Spreadsheets', 'Manual tracking'],
    gap: 'No unified inbox designed for hospitality workflows',
  },
  {
    problem: 'Losing repeat guests due to no follow-up system or loyalty tracking',
    severity: 'high' as const,
    currentSolutions: ['Generic email tools', 'Memory'],
    gap: 'No CRM connects stay history to personalized outreach',
  },
  {
    problem: 'Difficulty tracking revenue per channel and seasonal pricing optimization',
    severity: 'medium' as const,
    currentSolutions: ['Manual reports', 'Accounting software'],
    gap: 'No real-time analytics tied to booking source',
  },
];

/* ── Social proof data ── */
const socialPosts = [
  {
    platform: 'Reddit',
    author: 'u/innkeeper_sarah',
    subreddit: 'r/bedandbreakfast',
    content: 'We tried 4 different PMS systems and none of them handle guest relationships well. I just want something that remembers my repeat guests and lets me send a personal note before they arrive...',
    upvotes: 47,
    comments: 23,
    sentiment: 'negative' as const,
  },
  {
    platform: 'Reddit',
    author: 'u/bnb_owner_mike',
    subreddit: 'r/smallbusiness',
    content: 'Running a B&B with 8 rooms and I spend 2 hours daily on admin. Is there a CRM that actually understands hospitality? The Salesforce-type tools are way too complex for us.',
    upvotes: 112,
    comments: 34,
    sentiment: 'negative' as const,
  },
];

/* ── Tech stack data ── */
const techLayers = [
  { layer: 'Frontend', tech: 'Next.js + React', cost: '$0/mo', complexity: 'medium' },
  { layer: 'Backend', tech: 'Node.js + tRPC', cost: '$0/mo', complexity: 'medium' },
  { layer: 'Database', tech: 'PostgreSQL (Supabase)', cost: '$25/mo', complexity: 'easy' },
  { layer: 'Hosting', tech: 'Vercel', cost: '$20/mo', complexity: 'easy' },
  { layer: 'Payments', tech: 'Stripe', cost: '2.9% + 30¢', complexity: 'easy' },
  { layer: 'Email', tech: 'Resend', cost: '$0/mo', complexity: 'easy' },
];

/* ── Value ladder data ── */
const valueTiers = [
  { tier: 'LEAD MAGNET', name: 'Free B&B Guest Tracker', price: 'Free', color: 'bg-muted-foreground' },
  { tier: 'FRONTEND', name: 'B&B CRM Starter', price: '$29/mo', color: 'bg-accent' },
  { tier: 'CORE', name: 'B&B CRM Pro', price: '$79/mo', color: 'bg-primary' },
  { tier: 'BACKEND', name: 'B&B CRM Enterprise', price: '$199/mo', color: 'bg-[hsl(260,60%,55%)]' },
];

/* ── Why Now data ── */
const whyNowTriggers = [
  'Post-pandemic travel boom driving 18% YoY growth in independent stays',
  'Legacy PMS vendors averaging 2.3★ reviews — mass customer dissatisfaction',
  '"B&B management software" search volume up 340% in 24 months',
  'Airbnb regulation forcing hosts toward direct-booking CRM tools',
];

/* ── Proof signals ── */
const proofSignals = {
  demand: ['High search volume growth for niche PMS tools', 'Active Reddit communities requesting alternatives', '47 forum threads about B&B CRM gaps in last 90 days'],
  risks: ['Low switching costs — incumbents could add CRM features', 'Seasonal revenue pattern requires careful pricing'],
};

const threatColors = { high: 'text-destructive', medium: 'text-warning', low: 'text-success' };
const threatIcons = { high: ShieldAlert, medium: Shield, low: ShieldCheck };
const severityStyles = {
  high: 'bg-destructive/15 text-destructive border-destructive/30',
  medium: 'bg-warning/15 text-warning border-warning/30',
  low: 'bg-success/15 text-success border-success/30',
};
const sentimentStyles = {
  positive: 'bg-success/15 text-success',
  negative: 'bg-destructive/15 text-destructive',
  neutral: 'bg-muted text-muted-foreground',
};

/* ── Section divider ── */
function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}

export function ReportShowcase() {
  const [ref, isInView] = useInView({ threshold: 0.05 });

  return (
    <section ref={ref} className="relative px-6 py-20">
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <h2
          className={`text-center font-display text-3xl font-bold text-foreground transition-all duration-700 sm:text-4xl ${
            isInView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}
        >
          See What You <span className="text-gradient">Get</span>
        </h2>
        <p
          className={`mt-3 text-center text-muted-foreground transition-all duration-700 delay-100 ${
            isInView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          A full report for &quot;Custom CRM for Bed &amp; Breakfasts&quot; — scroll to explore
        </p>

        {/* Browser window */}
        <div
          className={`mt-8 overflow-hidden rounded-2xl border border-border transition-all duration-700 delay-200 ${
            isInView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          {/* Title bar */}
          <div className="flex items-center gap-2 border-b border-border bg-card/80 px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-destructive/40" />
              <div className="h-3 w-3 rounded-full bg-warning/40" />
              <div className="h-3 w-3 rounded-full bg-success/40" />
            </div>
            <span className="ml-2 text-xs text-muted-foreground">
              IdeationLab — Full Report: B&B CRM Analysis
            </span>
          </div>

          {/* Scrollable report */}
          <div className="relative max-h-[640px] overflow-y-auto bg-background p-6 sm:p-8">

            {/* ─── 1. USER STORY ─── */}
            <div className="rounded-xl border border-border bg-card/50 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <BookOpen className="h-4 w-4 text-primary" />
                Your Business Story
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Sarah</span> runs a charming 6-room bed
                and breakfast in Vermont. She spends 2+ hours daily juggling guest emails,
                OTA messages, and a spreadsheet of past visitors. When a repeat guest books,
                she doesn&apos;t remember their breakfast preference or anniversary date.
                <span className="font-medium text-foreground"> Your CRM</span> gives her a unified
                guest profile with stay history, preferences, and automated follow-ups —
                turning one-time visitors into loyal regulars.
              </p>
            </div>

            {/* ─── 2. SCORE CARDS ─── */}
            <div className="mt-8">
              <SectionHeader icon={Target} label="Validation Scores" />
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {scores.map((s) => (
                  <div key={s.label} className="rounded-xl border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="mt-1 font-display text-2xl font-bold text-foreground">
                      {s.value}
                    </p>
                    <div className="mx-auto mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                      <div
                        className={`h-full rounded-full ${s.color}`}
                        style={{ width: `${s.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── 3. MARKET SIZING ─── */}
            <div className="mt-8">
              <SectionHeader icon={BarChart3} label="Market Sizing" />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {marketCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-xl border border-primary/20 bg-gradient-to-b from-primary/10 to-primary/5 p-4"
                  >
                    <p className="text-xs font-medium text-primary">{card.label}</p>
                    <p className="text-[10px] text-muted-foreground">{card.fullLabel}</p>
                    <p className="mt-2 font-display text-2xl font-bold text-foreground">
                      {card.value}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-success">
                      <TrendingUp className="h-3 w-3" />
                      {card.growth}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── 4. WHY NOW ─── */}
            <div className="mt-8">
              <SectionHeader icon={Zap} label="Why Now" />
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">Urgency</span>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-warning via-success to-success"
                      style={{ width: '85%' }}
                    />
                  </div>
                </div>
                <span className="font-display text-lg font-bold text-success">85</span>
              </div>
              <div className="mt-4 space-y-2">
                {whyNowTriggers.map((trigger) => (
                  <div key={trigger} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-success" />
                    {trigger}
                  </div>
                ))}
              </div>
            </div>

            {/* ─── 5. COMPETITORS ─── */}
            <div className="mt-8">
              <SectionHeader icon={Shield} label="Competitive Landscape" />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {competitors.map((comp) => {
                  const ThreatIcon = threatIcons[comp.threat];
                  return (
                    <div key={comp.name} className="rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">{comp.name}</span>
                        <ThreatIcon className={`h-4 w-4 ${threatColors[comp.threat]}`} />
                      </div>
                      <span className="mt-0.5 inline-block text-[10px] text-muted-foreground">
                        {comp.type}
                      </span>
                      <div className="mt-3 space-y-1">
                        {comp.strengths.map((s) => (
                          <p key={s} className="text-xs">
                            <span className="text-success">+</span>{' '}
                            <span className="text-muted-foreground">{s}</span>
                          </p>
                        ))}
                        {comp.weaknesses.map((w) => (
                          <p key={w} className="text-xs">
                            <span className="text-destructive">−</span>{' '}
                            <span className="text-muted-foreground">{w}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── 6. PAIN POINTS ─── */}
            <div className="mt-8">
              <SectionHeader icon={AlertCircle} label="Pain Points" />
              <div className="mt-4 space-y-3">
                {painPoints.map((pp) => (
                  <div key={pp.problem} className="rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{pp.problem}</p>
                      <span
                        className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${severityStyles[pp.severity]}`}
                      >
                        {pp.severity}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {pp.currentSolutions.map((sol) => (
                        <span
                          key={sol}
                          className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {sol}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-accent">
                      <ArrowUpRight className="h-3 w-3" />
                      {pp.gap}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── 7. SOCIAL PROOF ─── */}
            <div className="mt-8">
              <SectionHeader icon={MessageCircle} label="Social Proof" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {socialPosts.map((post) => (
                  <div key={post.author} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-[#ff4500]" />
                        <span className="text-xs font-medium text-foreground">{post.author}</span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sentimentStyles[post.sentiment]}`}
                      >
                        {post.sentiment}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">{post.subreddit}</p>
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                      &quot;{post.content}&quot;
                    </p>
                    <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" /> {post.upvotes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" /> {post.comments}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── 8. PROOF SIGNALS ─── */}
            <div className="mt-8">
              <SectionHeader icon={Signal} label="Validation Signals" />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium text-success">Demand Indicators</p>
                  <div className="space-y-1.5">
                    {proofSignals.demand.map((d) => (
                      <div key={d} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-success" />
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-warning">Risk Factors</p>
                  <div className="space-y-1.5">
                    {proofSignals.risks.map((r) => (
                      <div key={r} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-warning" />
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── 9. TECH STACK ─── */}
            <div className="mt-8">
              <SectionHeader icon={Server} label="Recommended Tech Stack" />
              <div className="mt-4 space-y-2">
                {techLayers.map((t) => (
                  <div
                    key={t.layer}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                        <Layers className="h-3 w-3 text-primary" />
                      </span>
                      <div>
                        <p className="text-xs font-medium text-foreground">{t.layer}</p>
                        <p className="text-[10px] text-muted-foreground">{t.tech}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{t.cost}</span>
                  </div>
                ))}
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Estimated Monthly Cost</p>
                  <p className="font-display text-lg font-bold text-foreground">$45 – $70/mo</p>
                </div>
              </div>
            </div>

            {/* ─── 10. VALUE LADDER ─── */}
            <div className="mt-8">
              <SectionHeader icon={Layers} label="Value Ladder" />
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
                {valueTiers.map((vt, i) => (
                  <div
                    key={vt.tier}
                    className="flex-1 rounded-xl border border-border p-3 text-center"
                  >
                    <span
                      className={`inline-block h-1.5 w-8 rounded-full ${vt.color}`}
                    />
                    <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {vt.tier}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-foreground">{vt.name}</p>
                    <p className="mt-1 font-display text-sm font-bold text-primary">
                      {vt.price}
                    </p>
                    {i < valueTiers.length - 1 && (
                      <div className="mt-2 hidden text-muted-foreground/30 sm:block">→</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ─── 11. TIMING ─── */}
            <div className="mt-8">
              <SectionHeader icon={Clock} label="Timing Analysis" />
              <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/15 px-3 py-1 text-sm font-medium text-success">
                  Strong Timing — Act Now
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                The convergence of post-pandemic travel recovery, dissatisfaction with legacy tools,
                and rising demand for direct-booking solutions creates an ideal window.
                First movers in the B&B-specific CRM space will capture outsized market share
                before incumbents adapt.
              </p>
            </div>

            {/* ─── END CARD ─── */}
            <div className="mt-10 rounded-xl border border-primary/20 bg-gradient-to-b from-primary/10 to-transparent p-5 text-center">
              <p className="font-display text-sm font-semibold text-foreground">
                This report was generated in under 10 minutes.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Market sizing, competitive analysis, social proof, tech stack, pricing strategy — all AI-researched.
              </p>
            </div>

            {/* Gradient fade */}
            <div className="pointer-events-none sticky bottom-0 -mb-6 h-16 bg-gradient-to-t from-background to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
