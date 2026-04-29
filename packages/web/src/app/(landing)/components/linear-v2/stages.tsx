'use client';

import { SectionShell, IllustrationContainer, Separator } from './section-shell';
import { CaptureThreadIllustration } from './illustrations/capture-thread';
import { IncubationTimelineIllustration } from './illustrations/incubation-timeline';
import { SynthesisClustersIllustration } from './illustrations/synthesis-clusters';
import { CrystallizeCardIllustration } from './illustrations/crystallize-card';
import { ValidateMonitorIllustration } from './illustrations/validate-monitor';

export function StagesSections() {
  return (
    <>
      <SectionShell
        id="capture"
        stageNum={1}
        stageLabel="CAPTURE"
        title={<>Think it. Tap it.<br />It&apos;s saved.</>}
        description="Capture thoughts in seconds: voice memo, quick note, or typed entry, with auto-tagging and capture streaks to build the habit. Editing happens later, in a separate flow, so half-formed ideas aren't killed before they grow."
        phrase="Don't polish too early. Capture raw. Refine later."
        scienceBody="Research shows the specific words people use to describe problems contain marketing and positioning signals that get lost when self-edited into polished text. Voice capture preserves what matters."
        scienceCitation="Vandenbroucke & Pearce (2018), PMC"
        tabs={['Quick Note', 'Voice Memo', 'Type Tagging', 'Capture Streaks']}
        illustration={
          <IllustrationContainer glow="tl">
            <CaptureThreadIllustration />
          </IllustrationContainer>
        }
      />
      <Separator />

      <SectionShell
        id="incubate"
        stageNum={2}
        stageLabel="INCUBATION"
        title={<>Your best ideas are<br />already in here.<br />Let&apos;s find them.</>}
        description="A resurfacing engine brings old thoughts back at the right moment, usually 24 to 48 hours after capture. Daily revisits keep the strongest ones alive, and decay timers flag the ones your brain has stopped engaging with."
        phrase="We brought this back because your brain wasn't done with it."
        scienceBody="24 to 48 hours is the minimum effective incubation period. Less and your subconscious hasn't finished processing. More than 14 days without revisiting, and the thought decays."
        scienceCitation="Wallas (1926), APA Monitor on Creativity (2022)"
        tabs={['Resurfacing', 'Daily Revisit', 'Decay Timers']}
        reverse
        illustration={
          <IllustrationContainer glow="tr">
            <IncubationTimelineIllustration />
          </IllustrationContainer>
        }
      />
      <Separator />

      <SectionShell
        id="synthesize"
        stageNum={3}
        stageLabel="SYNTHESIS"
        title={<>Scattered notes<br />become sharp ideas.</>}
        description="Drop your captured thoughts into Cluster. AI groups them into themes, surfaces collisions across domains, and highlights the unexpected connections you'd never spot scrolling a notes app. The strongest signals rise to the top."
        phrase="Find the signal in your own noise."
        scienceBody="Ideas follow a 'wave-particle duality': they're both discrete artifacts (individual thoughts) and fluid processes (evolving streams within clusters). Cluster supports both modes."
        scienceCitation='Academy of Management Annals (2021), "Unpacking Ideas"'
        tabs={['Cluster', 'Collision Detection', 'Stream View', 'AI Synthesis']}
        illustration={
          <IllustrationContainer glow="center">
            <SynthesisClustersIllustration />
          </IllustrationContainer>
        }
      />
      <Separator />

      <SectionShell
        id="crystallize"
        stageNum={4}
        stageLabel="CRYSTALLIZATION"
        title={<>This is the moment<br />your idea becomes real.</>}
        description="From napkin sketch to business blueprint. IdeaFuel takes the themes from Cluster and crystallizes them into a structured business concept: problem, solution, value prop, target market, business model, and differentiation."
        phrase="From scattered thoughts to structured business."
        scienceBody="Systematic approaches to creative thinking can be taught and supported externally. IdeaFuel's structured approach isn't limiting creativity, it's amplifying it."
        scienceCitation="Ness, R. (2012), Innovation Generation"
        tabs={['Business Concept', 'Scoring', 'Assumptions', 'Version History']}
        reverse
        illustration={
          <IllustrationContainer glow="tl">
            <CrystallizeCardIllustration />
          </IllustrationContainer>
        }
      />
      <Separator />

      <SectionShell
        id="validate"
        stageNum={5}
        stageLabel="VALIDATION"
        title={<>Test it before you<br />build it. Build it before<br />you bet on it.</>}
        description="A 10-minute Spark interview produces your problem statement, value prop, business model, and next steps. Then deep research, market sizing, a full business plan, and a financial model. Every artifact a serious founder needs, generated in 1 to 3 days instead of weeks."
        phrase="Before AI, testing an idea cost thousands and took weeks. Now the entire validation stack takes 1 to 3 days."
        scienceBody="Two cognitive routes to creativity: fast unconscious (System 1 / aha moments) and slow deliberate (System 2). Validation engages System 2, the analytical mode that stress-tests the brilliant flashes from System 1."
        scienceCitation="APA Monitor (2022), The Science Behind Creativity"
        tabs={['Spark Interview', 'Deep Research', 'Market Sizing', 'Business Plan', 'Financial Model']}
        illustration={
          <IllustrationContainer glow="tr">
            <ValidateMonitorIllustration />
          </IllustrationContainer>
        }
      />
    </>
  );
}
