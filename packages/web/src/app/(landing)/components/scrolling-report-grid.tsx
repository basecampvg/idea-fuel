'use client';

import { ReportCard, REPORT_CARDS } from './report-card';

// Split cards into 3 columns with different orderings
const col1Cards = [REPORT_CARDS[0], REPORT_CARDS[3], REPORT_CARDS[6], REPORT_CARDS[9], REPORT_CARDS[12]];
const col2Cards = [REPORT_CARDS[1], REPORT_CARDS[4], REPORT_CARDS[7], REPORT_CARDS[10], REPORT_CARDS[13]];
const col3Cards = [REPORT_CARDS[2], REPORT_CARDS[5], REPORT_CARDS[8], REPORT_CARDS[11], REPORT_CARDS[14]];

function ScrollColumn({
  cards,
  duration,
  direction = 'up',
}: {
  cards: typeof REPORT_CARDS;
  duration: number;
  direction?: 'up' | 'down';
}) {
  return (
    <div
      className="relative flex-1 overflow-hidden"
      style={{
        maskImage:
          'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
      }}
    >
      <div
        className="flex flex-col gap-3"
        style={{
          animation: `${direction === 'up' ? 'scroll-up' : 'scroll-down'} ${duration}s linear infinite`,
        }}
      >
        {/* Three copies for seamless gapless loop */}
        {[...cards, ...cards, ...cards].map((card, i) => (
          <ReportCard key={`${card.title}-${i}`} {...card} />
        ))}
      </div>
    </div>
  );
}

export function ScrollingReportGrid({ className = '' }: { className?: string }) {
  return (
    <div className={`flex gap-3 ${className}`} style={{ height: '100%' }}>
      <ScrollColumn cards={col1Cards} duration={50} direction="up" />
      <ScrollColumn cards={col2Cards} duration={60} direction="down" />
      <ScrollColumn cards={col3Cards} duration={45} direction="up" />
    </div>
  );
}
