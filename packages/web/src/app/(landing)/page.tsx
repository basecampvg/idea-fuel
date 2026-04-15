'use client';

import { HeroSection } from './components/hero-section';
import { ProblemSection } from './components/problem-section';
import { ScienceSection } from './components/science-section';
import { FeaturesSection } from './components/features-section';
import { PricingSection } from './components/pricing-motion';
import { FinalCtaSection } from './components/final-cta-section';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <ScienceSection />
      <FeaturesSection />
      <PricingSection />
      <FinalCtaSection />
    </>
  );
}
