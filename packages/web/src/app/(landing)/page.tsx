import { HeroSection } from './components/hero-section';
import { DemoSection } from './components/demo-section';
import { NarrativeSection } from './components/narrative-section';
import { PipelineSection } from './components/pipeline-section';
import { ReportShowcase } from './components/report-showcase';
import { FinalCtaSection } from './components/final-cta-section';

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background to-card" />

      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      <HeroSection />
      <DemoSection />
      <NarrativeSection />
      <PipelineSection />
      <ReportShowcase />
      <FinalCtaSection />
    </div>
  );
}
