'use client';

import { HeroSection } from './components/linear-v2/hero';
import { NarrativeSection } from './components/linear-v2/narrative';
import { StagesSections } from './components/linear-v2/stages';
import { CompetitiveSection } from './components/linear-v2/competitive';
import { ResearchSection } from './components/linear-v2/research';
import { QuotesSection } from './components/linear-v2/quotes';
import { FinalCtaSection } from './components/linear-v2/final-cta';

export default function LandingPage() {
  return (
    <>
      <div className="page-grain" />
      <HeroSection />
      <Separator />
      <NarrativeSection />
      <Separator />
      <StagesSections />
      <Separator />
      <CompetitiveSection />
      <Separator />
      <ResearchSection />
      <Separator />
      <QuotesSection />
      <FinalCtaSection />
    </>
  );
}

function Separator() {
  return (
    <div className="relative flex h-24 items-center justify-center">
      <div
        className="mx-auto h-px w-full max-w-[1200px]"
        style={{
          background:
            'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)',
        }}
      />
    </div>
  );
}
