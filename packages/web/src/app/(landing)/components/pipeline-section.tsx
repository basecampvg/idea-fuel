'use client';

import { MessageSquare, Search, FileText, ArrowRight, ArrowDown } from 'lucide-react';
import { useInView } from './use-in-view';

const steps = [
  {
    number: 1,
    icon: MessageSquare,
    title: 'AI Interview',
    description:
      'We ask the questions investors will ask — in a 5-minute AI conversation that uncovers your idea\'s strengths and gaps.',
    circleClass: 'number-circle-1',
  },
  {
    number: 2,
    icon: Search,
    title: 'Deep Research',
    description:
      '5 parallel AI researchers analyze your market, competitors, and timing using real-time data and trends.',
    circleClass: 'number-circle-2',
  },
  {
    number: 3,
    icon: FileText,
    title: 'Comprehensive Report',
    description:
      'Get a business plan, competitive analysis, and financial model — delivered in minutes, not weeks.',
    circleClass: 'number-circle-3',
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
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.number} className="relative flex flex-col items-center">
              {/* Step card */}
              <div
                className="glass-card w-full text-center transition-all duration-500"
                style={{
                  transitionDelay: isInView ? `${(i + 1) * 200}ms` : '0ms',
                  opacity: isInView ? 1 : 0,
                  transform: isInView ? 'translateY(0)' : 'translateY(20px)',
                }}
              >
                {/* Number + Icon */}
                <div className="mx-auto mb-4 flex items-center justify-center gap-3">
                  <span className={`number-circle ${step.circleClass}`}>
                    {step.number}
                  </span>
                  <step.icon className="h-5 w-5 text-accent" />
                </div>

                <h3 className="font-display text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>

              {/* Arrow connector (not on last step) */}
              {i < steps.length - 1 && (
                <>
                  {/* Desktop: horizontal arrow */}
                  <div
                    className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-muted-foreground/30 md:block"
                    style={{
                      transitionDelay: isInView ? `${(i + 1) * 200 + 300}ms` : '0ms',
                      opacity: isInView ? 1 : 0,
                      transition: 'opacity 0.4s ease',
                    }}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </div>
                  {/* Mobile: vertical arrow */}
                  <div
                    className="my-2 text-muted-foreground/30 md:hidden"
                    style={{
                      transitionDelay: isInView ? `${(i + 1) * 200 + 300}ms` : '0ms',
                      opacity: isInView ? 1 : 0,
                      transition: 'opacity 0.4s ease',
                    }}
                  >
                    <ArrowDown className="h-5 w-5" />
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
