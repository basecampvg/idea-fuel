'use client';

import { Lightbulb, MessageSquare, Search, FileText, ArrowRight, ArrowDown } from 'lucide-react';
import { useInView } from './use-in-view';

const steps = [
  {
    number: 1,
    icon: Lightbulb,
    title: 'Capture Your Idea',
    description:
      'Log ideas on the fly using our mobile app or web platform — capture inspiration whenever it strikes, wherever you are.',
    circleClass: 'number-circle-1',
  },
  {
    number: 2,
    icon: MessageSquare,
    title: 'AI Interview',
    description:
      'We ask the questions investors will ask — in a 5-minute AI conversation that uncovers your idea\'s strengths and gaps.',
    circleClass: 'number-circle-2',
  },
  {
    number: 3,
    icon: Search,
    title: 'Deep Research',
    description:
      '5 parallel AI researchers analyze your market, competitors, and timing using real-time data and trends.',
    circleClass: 'number-circle-3',
  },
  {
    number: 4,
    icon: FileText,
    title: 'Comprehensive Report',
    description:
      'Get a business plan, competitive analysis, and financial model — delivered in minutes, not weeks.',
    circleClass: 'number-circle-4',
  },
];

export function PipelineSection() {
  const [ref, isInView] = useInView({ threshold: 0.15 });

  return (
    <section ref={ref} className="relative px-6 py-20">
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <h2
          className={`text-center font-display text-3xl font-bold text-foreground transition-all duration-700 sm:text-4xl ${
            isInView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}
        >
          How <span className="text-gradient">IdeationLab</span> Works
        </h2>

        {/* Pipeline steps */}
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.number} className="relative flex h-full flex-col items-center">
              {/* Step card */}
              <div
                className="glass-card flex h-full w-full flex-col text-center"
                style={{
                  transition: 'all 500ms ease',
                  transitionDelay: isInView ? `${(i + 1) * 200}ms` : '0ms',
                  opacity: isInView ? 1 : 0,
                  transform: isInView ? 'translateY(0)' : 'translateY(20px)',
                }}
              >
                {/* Icon Circle with Number Badge */}
                <div className="relative mx-auto mb-6 flex items-center justify-center">
                  {/* Main icon circle with gradient */}
                  <div
                    className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 shadow-lg hover:scale-110 hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
                    style={{
                      transition: 'all 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transitionDelay: isInView ? `${(i + 1) * 200}ms` : '0ms',
                      opacity: isInView ? 1 : 0,
                      transform: isInView
                        ? 'translateY(0) scale(1)'
                        : 'translateY(20px) scale(0.8)',
                    }}
                  >
                    <step.icon
                      className="h-7 w-7 text-white transition-transform duration-300 group-hover:rotate-6"
                      strokeWidth={1.5}
                    />

                    {/* Small numbered badge */}
                    <div className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-primary/30 bg-background/80 text-[12px] font-semibold text-white">
                      {step.number}
                    </div>
                  </div>
                </div>

                <h3 className="font-display text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>

              {/* Arrow connector (not on last step) */}
              {i < steps.length - 1 && (
                <>
                  {/* Desktop: horizontal arrow */}
                  <div
                    className="absolute -right-12 top-16 hidden text-muted-foreground/40 md:block"
                    style={{
                      transitionDelay: isInView ? `${(i + 1) * 200 + 300}ms` : '0ms',
                      opacity: isInView ? 1 : 0,
                      transition: 'opacity 0.4s ease',
                    }}
                  >
                    <ArrowRight className="h-7 w-7" strokeWidth={1.5} />
                  </div>
                  {/* Mobile: vertical arrow */}
                  <div
                    className="my-3 text-muted-foreground/40 md:hidden"
                    style={{
                      transitionDelay: isInView ? `${(i + 1) * 200 + 300}ms` : '0ms',
                      opacity: isInView ? 1 : 0,
                      transition: 'opacity 0.4s ease',
                    }}
                  >
                    <ArrowDown className="h-7 w-7" strokeWidth={1.5} />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
