import { HeroSection } from './components/hero-section';
import { NarrativeSection } from './components/narrative-section';
import { PipelineSection } from './components/pipeline-section';
import { ReportContentsSection } from './components/report-contents-section';
import { ReportShowcase } from './components/report-showcase';
import { FinalCtaSection } from './components/final-cta-section';

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background to-card" />

      <HeroSection />
      <NarrativeSection />
      <PipelineSection />
      <ReportContentsSection />
      <ReportShowcase />
      <FinalCtaSection />
    </div>
  );
}
