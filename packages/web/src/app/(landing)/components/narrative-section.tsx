'use client';

import { AlertTriangle, DollarSign, Clock } from 'lucide-react';
import { useInView } from './use-in-view';

const stats = [
  {
    icon: AlertTriangle,
    value: '42%',
    label: 'of startups fail from no market need',
    source: 'CB Insights',
  },
  {
    icon: DollarSign,
    value: '$29K',
    label: 'average spent before first customer',
    source: 'Startup Genome',
  },
  {
    icon: Clock,
    value: '6 months',
    label: 'average time to validate an idea',
    source: 'Industry average',
  },
];

export function NarrativeSection() {
  const [ref, isInView] = useInView({ threshold: 0.2 });

  return (
    <section ref={ref} className="relative px-6 py-20">
      <div className="mx-auto max-w-4xl">
        {/* Transition line */}
        <p
          className={`text-center font-display text-2xl font-bold text-foreground transition-all duration-700 sm:text-3xl ${
            isInView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}
        >
          That took <span className="text-gradient">8 seconds</span>.
          <br className="sm:hidden" />
          <span className="text-muted-foreground">
            {' '}Most founders spend 8 months guessing.
          </span>
        </p>

        {/* Stats grid */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {stats.map((stat, i) => (
            <div
              key={stat.value}
              className="glass-card text-center transition-all duration-500"
              style={{
                transitionDelay: isInView ? `${(i + 1) * 150}ms` : '0ms',
                opacity: isInView ? 1 : 0,
                transform: isInView ? 'translateY(0)' : 'translateY(20px)',
              }}
            >
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="font-display text-2xl font-bold text-foreground">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-xs text-muted-foreground/60">{stat.source}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
