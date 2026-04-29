'use client';

/**
 * Pixel-accurate replica of the IdeaFuel project Summary view (the page
 * shown after a report runs).
 *
 * Mirrors:
 *   - project-secondary-nav.tsx (left 240px sidebar with Back to Vault, title,
 *     status, and Overview/Market/Validation/History nav sections)
 *   - project-dashboard-nav.tsx (40px top tab bar: Research/Financial/Reporting/Go to Market)
 *   - project-header.tsx (title + status pill + Created date + idea description callout)
 *   - user-story.tsx (The Story scenario + accordion items)
 *   - score-cards.tsx (4 semicircle arc gauges 180→360°, drop-shadow primary
 *     glow, justification cards below)
 *   - agent-insights-section.tsx (Sparkles icon + AI Agent Insights cards)
 */

const PRIMARY = 'hsl(7, 80%, 57%)';
const PRIMARY_TINT = 'hsl(7, 80%, 57%, 0.1)';
const PRIMARY_BORDER = 'hsl(7, 80%, 57%, 0.2)';
const PRIMARY_GLOW = 'hsl(7, 80%, 57%, 0.4)';
const FG = 'hsl(0, 0%, 91%)';
const MUTED_FG = 'hsl(0, 0%, 55%)';
const MUTED = 'hsl(0, 0%, 9%)';
const BG = 'hsl(0, 0%, 4%)';
const BORDER = 'hsl(0, 0%, 13%)';

export function HeroDashboard() {
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: BG }}>
      <div className="grid h-full" style={{ gridTemplateColumns: '220px 1fr' }}>
        {/* ============= LEFT: project secondary nav ============= */}
        <aside
          className="flex flex-col"
          style={{ background: BG, borderRight: `1px solid ${BORDER}` }}
        >
          {/* Header block */}
          <div className="px-4 pb-3 pt-5">
            <div
              className="flex items-center gap-1.5 text-[11px]"
              style={{ color: MUTED_FG }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 4l-4 4 4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back to Vault
            </div>
            <h2
              className="mt-2 truncate text-[13px] font-semibold"
              style={{ color: FG }}
              title="AI Meal Planner for Busy Parents"
            >
              AI Meal Planner
            </h2>
            <div
              className="mt-1 text-[11px] font-medium"
              style={{ color: PRIMARY }}
            >
              Ready
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-hidden px-3 pb-4">
            <NavSection title="Overview">
              <NavLink icon="dashboard" label="Summary" active />
              <NavLink icon="target" label="Business Fit" />
            </NavSection>
            <NavSection title="Market" mt>
              <NavLink icon="trendingup" label="Market Analysis" />
              <NavLink icon="piechart" label="Market Sizing" />
              <NavLink icon="clock" label="Why Now" />
              <NavLink icon="search" label="Keyword Trends" />
            </NavSection>
            <NavSection title="Validation" mt>
              <NavLink icon="radio" label="Proof Signals" />
              <NavLink icon="users" label="Social Proof" />
              <NavLink icon="alert" label="Pain Points" />
              <NavLink icon="swords" label="Competitors" />
            </NavSection>
            <NavSection title="History" mt>
              <NavLink icon="message" label="Interview Summary" />
            </NavSection>
          </nav>
        </aside>

        {/* ============= RIGHT: dashboard ============= */}
        <div className="flex flex-col overflow-hidden">
          {/* Top tab bar — 40px */}
          <div
            className="flex items-center gap-2 px-6"
            style={{
              height: '40px',
              borderBottom: `1px solid ${BORDER}`,
              background: 'rgba(10,10,10,0.95)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span
              className="mr-1 select-none text-[10px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: 'hsl(0, 0%, 55%, 0.5)' }}
            >
              Dashboard:
            </span>
            <DashTab icon="flask" label="Research" active />
            <DashTab icon="dollar" label="Financial" />
            <DashTab icon="file" label="Reporting" />
            <DashTab icon="rocket" label="Go to Market" />
          </div>

          {/* Content (mimics ProjectHeader + page.tsx COMPLETE summary) */}
          <div
            className="flex-1 overflow-hidden px-6 py-5"
            style={{
              WebkitMaskImage:
                'linear-gradient(to bottom, black 0%, black 88%, transparent 100%)',
              maskImage:
                'linear-gradient(to bottom, black 0%, black 88%, transparent 100%)',
            }}
          >
            {/* ProjectHeader replica */}
            <ProjectHeader />

            {/* The Story / UserStory replica */}
            <div className="mt-5">
              <UserStorySection />
            </div>

            {/* ScoreCards replica */}
            <div className="mt-5">
              <ScoreCardsSection />
            </div>

            {/* AgentInsights replica */}
            <div className="mt-5">
              <AgentInsightsBlock />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============= LEFT NAV ============= */

function NavSection({
  title,
  children,
  mt,
}: {
  title: string;
  children: React.ReactNode;
  mt?: boolean;
}) {
  return (
    <div className={mt ? 'mt-5' : 'mt-2'}>
      <div className="mb-1.5 px-3">
        <span
          className="text-[10px] font-medium uppercase tracking-[0.1em]"
          style={{ color: MUTED_FG }}
        >
          {title}
        </span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavLink({
  icon,
  label,
  active,
}: {
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className="relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium"
      style={{
        background: active ? PRIMARY_TINT : 'transparent',
        color: active ? PRIMARY : MUTED_FG,
        marginLeft: active ? '-1px' : 0,
        borderLeft: active ? `2px solid ${PRIMARY}` : 'none',
      }}
    >
      <NavIcon icon={icon} active={active} />
      <span className="truncate">{label}</span>
    </div>
  );
}

/* ============= TOP TAB BAR ============= */

function DashTab({
  icon,
  label,
  active,
}: {
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
      style={
        active
          ? { background: PRIMARY, color: 'white' }
          : { color: MUTED_FG }
      }
    >
      <DashIcon icon={icon} />
      {label}
    </span>
  );
}

/* ============= PROJECT HEADER REPLICA ============= */

function ProjectHeader() {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1
              className="truncate text-[20px] font-semibold tracking-[-0.01em]"
              style={{ color: FG }}
            >
              AI Meal Planner for Busy Parents
            </h1>
            {/* Status tag */}
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{ background: PRIMARY_TINT, color: PRIMARY }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>Ready</span>
            </div>
          </div>
          <p
            className="mt-1 text-[12px]"
            style={{ color: 'hsl(0, 0%, 55%, 0.6)' }}
          >
            Created Apr 14, 2026
          </p>
        </div>
      </div>

      {/* Idea description callout */}
      <div
        className="mt-3.5 rounded-xl p-3.5"
        style={{
          background: PRIMARY_TINT,
          border: `1px solid ${PRIMARY_BORDER}`,
        }}
      >
        <div className="flex gap-2.5">
          <svg
            className="mt-0.5 flex-shrink-0"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke={PRIMARY}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.6 1 1.4 1 2.3v1h6v-1c0-.9.4-1.7 1-2.3A7 7 0 0 0 12 2z" />
          </svg>
          <p
            className="whitespace-pre-wrap text-[12px] leading-relaxed"
            style={{ color: 'hsl(0, 0%, 91%, 0.8)' }}
          >
            A meal planning app that builds backward from your budget, learns your family&apos;s
            actual eating patterns, and outputs the grocery list directly. For busy parents
            who don&apos;t know how to cook.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============= USER STORY REPLICA ============= */

function UserStorySection() {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        background: BG,
        borderColor: BORDER,
      }}
    >
      <div
        className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em]"
        style={{ color: PRIMARY }}
      >
        The Story
      </div>

      {/* Scenario */}
      <p
        className="text-[12px] leading-relaxed"
        style={{ color: FG }}
      >
        It&apos;s 6:14 PM on a Tuesday. Sarah is staring into her fridge with two hungry kids
        behind her, $43 left in the grocery budget for the week, and zero energy left to plan
        what&apos;s for dinner. Again.
      </p>

      {/* Accordion items */}
      <div className="mt-4 space-y-3">
        <AccordionRow title="The User" body="Sarah, 34. Marketing manager. Two kids under 6. Cooks at a beginner level. Spends 45 min every Sunday dreading the meal plan. Wants to feed her family well without losing her Sundays." defaultOpen />
        <AccordionRow title="Their Problem" body="" />
        <AccordionRow title="The Solution" body="" />
        <AccordionRow title="The Outcome" body="" />
        <AccordionRow title="A Day in the Life" body="" />
      </div>
    </div>
  );
}

function AccordionRow({
  title,
  body,
  defaultOpen,
}: {
  title: string;
  body: string;
  defaultOpen?: boolean;
}) {
  return (
    <div>
      <div
        className="flex items-center justify-between pb-1.5"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <span
          className="font-mono text-[10px] font-light uppercase tracking-[1px]"
          style={{ color: PRIMARY }}
        >
          {title}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          style={{
            color: PRIMARY,
            transform: defaultOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 200ms',
          }}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {defaultOpen && body && (
        <p className="mt-2 text-[12px] leading-relaxed" style={{ color: FG }}>
          {body}
        </p>
      )}
    </div>
  );
}

/* ============= SCORE CARDS REPLICA ============= */

const dimensions = [
  { key: 'opportunity', label: 'Opportunity', score: 87, sublabel: 'Very Strong', confidence: 'high' as const },
  { key: 'problem', label: 'Problem', score: 82, sublabel: 'High Pain', confidence: 'high' as const },
  { key: 'feasibility', label: 'Feasibility', score: 74, sublabel: 'Strong', confidence: 'medium' as const },
  { key: 'whynow', label: 'Why Now', score: 79, sublabel: 'Perfect Timing', confidence: 'high' as const },
];

function ScoreCardsSection() {
  return (
    <div className="space-y-3">
      {/* Arc gauges grid */}
      <div
        className="rounded-xl p-3 pb-2"
        style={{ background: BG, border: `1px solid ${BORDER}` }}
      >
        <div className="grid grid-cols-4 gap-x-2 gap-y-1">
          {dimensions.map(({ key, ...rest }) => (
            <ArcGauge key={key} {...rest} />
          ))}
        </div>
        <div
          className="mt-2 flex items-center justify-between border-t pt-2 text-[10px]"
          style={{ color: MUTED_FG, borderColor: BORDER }}
        >
          <span>Based on 3 analysis passes</span>
          <span>92% confidence</span>
        </div>
      </div>

      {/* Justification cards */}
      <div className="flex flex-col gap-1.5">
        {dimensions.map(({ key, ...rest }) => (
          <JustificationRow key={key} {...rest} />
        ))}
      </div>
    </div>
  );
}

function ArcGauge({
  score,
  label,
  sublabel,
  confidence,
}: {
  score: number;
  label: string;
  sublabel: string;
  confidence: 'high' | 'medium' | 'low';
}) {
  // Match real component: cx=80, cy=72, r=56, semicircle 180→360°
  // Scaled down to fit inside hero panel
  const cx = 60;
  const cy = 54;
  const r = 42;
  const startAngle = 180;
  const endAngle = 360;
  const trackPath = describeArc(cx, cy, r, startAngle, endAngle);
  const totalLength = Math.PI * r;
  const dashOffset = totalLength * (1 - score / 100);

  const confColor =
    confidence === 'high' ? PRIMARY : confidence === 'medium' ? '#fbbf24' : '#fca5a5';

  return (
    <div className="flex flex-col items-center">
      <svg width={120} height={68} viewBox="0 0 120 68" className="overflow-visible">
        {/* Track */}
        <path
          d={trackPath}
          fill="none"
          stroke={BORDER}
          strokeWidth={6}
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={trackPath}
          fill="none"
          stroke={PRIMARY}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={totalLength}
          strokeDashoffset={dashOffset}
          style={{ filter: `drop-shadow(0 0 5px ${PRIMARY_GLOW})` }}
        />
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: 22,
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            fill: PRIMARY,
          }}
        >
          {score}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          style={{ fontSize: 8, fill: MUTED_FG }}
        >
          {sublabel}
        </text>
      </svg>
      <div className="mt-0.5 flex items-center gap-1">
        <div
          className="h-1 w-1 rounded-full"
          style={{ background: confColor }}
        />
        <span
          className="text-[9px] font-bold uppercase tracking-[0.1em]"
          style={{ color: FG }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const startRad = (Math.PI / 180) * startAngle;
  const endRad = (Math.PI / 180) * endAngle;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function JustificationRow({
  score,
  label,
  sublabel,
  confidence,
}: {
  score: number;
  label: string;
  sublabel: string;
  confidence: 'high' | 'medium' | 'low';
}) {
  const confColor =
    confidence === 'high' ? PRIMARY : confidence === 'medium' ? '#fbbf24' : '#fca5a5';
  const confLabel =
    confidence === 'high' ? 'High confidence' : confidence === 'medium' ? 'Medium confidence' : 'Low confidence';

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
      style={{ background: BG, border: `1px solid ${BORDER}` }}
    >
      <span
        className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em]"
        style={{ color: FG }}
      >
        {label}
      </span>
      <span
        className="shrink-0 font-mono text-[16px] font-extrabold tabular-nums"
        style={{ color: PRIMARY }}
      >
        {score}
      </span>
      <span className="flex-1 text-[11px]" style={{ color: MUTED_FG }}>
        {sublabel}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="h-1 w-1 rounded-full" style={{ background: confColor }} />
        <span className="hidden text-[10px] sm:inline" style={{ color: MUTED_FG }}>
          {confLabel}
        </span>
      </div>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ color: MUTED_FG }}>
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ============= AGENT INSIGHTS REPLICA ============= */

function AgentInsightsBlock() {
  const insights = [
    {
      title: 'Pricing power lives in the budget tier',
      body:
        'The $9 Pro tier is too cheap relative to the value delivered. Strong willingness to pay $15 to $19 for the family-shared plan based on conversations with parents managing $200 to $300/wk grocery budgets.',
    },
    {
      title: 'Distribution: parenting communities, not app stores',
      body:
        'Three parents independently mentioned discovering tools through Reddit (r/parenting, r/mealprep) and TikTok meal-planning creators. Direct app store search was last on the list.',
    },
  ];

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: BG, border: `1px solid ${BORDER}` }}
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: 'hsl(7, 80%, 57%, 0.2)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L13.5 8.5 20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-[12px] font-semibold" style={{ color: FG }}>
            AI Agent Insights
          </h2>
          <p className="text-[10px]" style={{ color: MUTED_FG }}>
            Generated from your conversations with the AI agent
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {insights.map((i, idx) => (
          <div
            key={idx}
            className="rounded-xl p-3"
            style={{ background: MUTED, border: `1px solid ${BORDER}` }}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <circle cx="12" cy="5" r="2" />
                <path d="M12 7v4M8 16h.01M16 16h.01" />
              </svg>
              <h3 className="truncate text-[12px] font-medium" style={{ color: FG }}>
                {i.title}
              </h3>
            </div>
            <p
              className="text-[11px] leading-relaxed"
              style={{ color: MUTED_FG }}
              dangerouslySetInnerHTML={{ __html: i.body }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============= ICON SETS ============= */

function NavIcon({ icon, active }: { icon: string; active?: boolean }) {
  const stroke = 'currentColor';
  const sw = active ? '2' : '1.5';
  switch (icon) {
    case 'dashboard':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="9" rx="1" stroke={stroke} strokeWidth={sw} />
          <rect x="14" y="3" width="7" height="5" rx="1" stroke={stroke} strokeWidth={sw} />
          <rect x="14" y="12" width="7" height="9" rx="1" stroke={stroke} strokeWidth={sw} />
          <rect x="3" y="16" width="7" height="5" rx="1" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case 'target':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke={stroke} strokeWidth={sw} />
          <circle cx="12" cy="12" r="6" stroke={stroke} strokeWidth={sw} />
          <circle cx="12" cy="12" r="2" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case 'trendingup':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M3 17l6-6 4 4 7-7M14 8h6M20 8v6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'piechart':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M21 12A9 9 0 11 12 3v9h9z" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'clock':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={sw} />
          <path d="M12 7v5l3 2" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case 'search':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke={stroke} strokeWidth={sw} />
          <path d="M20 20l-3.5-3.5" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case 'radio':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="2" fill={stroke} />
          <path d="M9 9a4.2 4.2 0 000 6M15 9a4.2 4.2 0 010 6M5.5 5.5a9 9 0 000 13M18.5 5.5a9 9 0 010 13" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case 'users':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="9" cy="8" r="3.5" stroke={stroke} strokeWidth={sw} />
          <path d="M2 21v-1a6 6 0 0112 0v1M16 4a4 4 0 010 8M16 21v-1a6 6 0 00-3-5" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case 'alert':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M12 3L2 21h20L12 3z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M12 9v5M12 17v.5" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case 'swords':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M14 14L6 22M14 14l4-4 4 4-4 4-4-4zM10 10L18 2M10 10L6 6 2 10l4 4 4-4z" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'message':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        </svg>
      );
  }
  return null;
}

function DashIcon({ icon }: { icon: string }) {
  const sw = '1.5';
  switch (icon) {
    case 'flask':
      return (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M9 3h6M10 3v6L4 19a2 2 0 002 3h12a2 2 0 002-3l-6-10V3" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
        </svg>
      );
    case 'dollar':
      return (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case 'file':
      return (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6zM14 3v6h6" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
        </svg>
      );
    case 'rocket':
      return (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M12 2c4 0 8 4 8 8 0 4-4 8-4 8h-4l-4-4V14c0-4 4-12 4-12z" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
          <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth={sw} />
          <path d="M5 19c0-2 1-3 3-3M3 21c0-3 2-5 5-5" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
  }
  return null;
}
