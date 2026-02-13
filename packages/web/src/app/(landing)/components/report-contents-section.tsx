'use client';

import {
  FileText,
  Target,
  TrendingUp,
  PieChart,
  Clock,
  Search,
  Signal,
  Users,
  AlertCircle,
  Shield,
  Layers,
  Code,
  Zap,
  MessageCircle,
  FileBarChart,
  Crosshair,
  BarChart3,
} from 'lucide-react';
import { useInView } from './use-in-view';

const reportSections = [
  {
    category: 'OVERVIEW',
    items: [
      { icon: FileText, label: 'Summary' },
      { icon: Target, label: 'Business Fit' },
    ],
  },
  {
    category: 'MARKET',
    items: [
      { icon: TrendingUp, label: 'Market Analysis' },
      { icon: PieChart, label: 'Market Sizing' },
      { icon: Clock, label: 'Why Now' },
      { icon: Search, label: 'Keyword Trends' },
    ],
  },
  {
    category: 'VALIDATION',
    items: [
      { icon: Signal, label: 'Proof Signals' },
      { icon: Users, label: 'Social Proof' },
      { icon: AlertCircle, label: 'Pain Points' },
      { icon: Shield, label: 'Competitors' },
    ],
  },
  {
    category: 'STRATEGY',
    items: [
      { icon: Layers, label: 'Offer / Value Ladder' },
      { icon: Code, label: 'Tech Stack' },
      { icon: Zap, label: 'Action Prompts' },
    ],
  },
  {
    category: 'HISTORY',
    items: [{ icon: MessageCircle, label: 'Interview Summary' }],
  },
  {
    category: 'REPORTS',
    items: [
      { icon: FileBarChart, label: 'Business Plan' },
      { icon: Crosshair, label: 'Positioning' },
      { icon: BarChart3, label: 'Competitive Analysis' },
    ],
  },
];

export function ReportContentsSection() {
  const [ref, isInView] = useInView({ threshold: 0.1 });

  return (
    <section ref={ref} className="relative px-6 py-20">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center">
          <h2
            className={`font-display text-3xl font-bold text-foreground transition-all duration-700 sm:text-4xl ${
              isInView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            Everything You Need in <span className="text-gradient">One Report</span>
          </h2>
          <p
            className={`mt-3 text-muted-foreground transition-all duration-700 delay-100 ${
              isInView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            From market analysis to technical architecture — comprehensive insights in minutes
          </p>
        </div>

        {/* Grid of sections */}
        <div className="mt-12 flex justify-center">
          <div className="grid gap-x-16 gap-y-8 sm:grid-cols-2 md:grid-cols-3">
          {reportSections.map((section, sectionIdx) => (
            <div
              key={section.category}
              className={`transition-all duration-700 ${
                isInView
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-8 opacity-0'
              }`}
              style={{ transitionDelay: `${200 + sectionIdx * 100}ms` }}
            >
              {/* Category label */}
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.category}
              </h3>

              {/* Items list */}
              <ul className="space-y-3">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.label} className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 flex-shrink-0 text-primary" />
                      <span className="text-sm text-foreground">{item.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          className={`mt-10 text-center transition-all duration-700 delay-700 ${
            isInView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}
        >
          <p className="text-sm text-muted-foreground">
            All sections backed by AI research, competitive intelligence, and market data
          </p>
        </div>
      </div>
    </section>
  );
}
