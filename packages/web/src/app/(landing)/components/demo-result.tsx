'use client';

import { useEffect, useState, useRef } from 'react';
import { TrendingUp, Shield, ShieldAlert, ShieldCheck, Clock, Target } from 'lucide-react';
import type { DemoOutput } from './demo-data';

interface DemoResultProps {
  data: DemoOutput;
  isFallback: boolean;
  animationKey: number;
}

function AnimatedCounter({ target, duration = 1500 }: { target: string; duration?: number }) {
  const [display, setDisplay] = useState('$0');
  const frameRef = useRef<number>(0);

  useEffect(() => {
    // Parse the target value (e.g., "$4.8B" → 4.8, "$11.6B" → 11.6)
    const numericMatch = target.match(/([\d.]+)/);
    if (!numericMatch) {
      setDisplay(target);
      return;
    }

    const targetNum = parseFloat(numericMatch[1]);
    const prefix = target.slice(0, target.indexOf(numericMatch[1]));
    const suffix = target.slice(target.indexOf(numericMatch[1]) + numericMatch[1].length);

    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = targetNum * eased;

      setDisplay(`${prefix}${current.toFixed(1)}${suffix}`);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    }

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return <span>{display}</span>;
}

function AnimatedScore({ target, duration = 1000 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(target * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    }

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return <span>{current}</span>;
}

const threatIcons = {
  high: ShieldAlert,
  medium: Shield,
  low: ShieldCheck,
};

const threatColors = {
  high: 'text-destructive',
  medium: 'text-warning',
  low: 'text-success',
};

const verdictColors = {
  green: 'bg-success/15 text-success border-success/30',
  yellow: 'bg-warning/15 text-warning border-warning/30',
  red: 'bg-destructive/15 text-destructive border-destructive/30',
};

export function DemoResult({ data, isFallback, animationKey }: DemoResultProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setPhase(0);

    const timers = [
      setTimeout(() => setPhase(1), 0),       // Container
      setTimeout(() => setPhase(2), 300),      // Market size
      setTimeout(() => setPhase(3), 800),      // Competitors
      setTimeout(() => setPhase(4), 1800),     // Timing
      setTimeout(() => setPhase(5), 2500),     // Score
    ];

    return () => timers.forEach(clearTimeout);
  }, [animationKey]);

  const scoreColor =
    data.viabilityScore >= 70
      ? 'text-success'
      : data.viabilityScore >= 50
        ? 'text-warning'
        : 'text-destructive';

  return (
    <div
      className={`mt-8 transition-all duration-500 ${
        phase >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      {isFallback && (
        <p className="mb-4 text-center text-sm text-muted-foreground">
          Here&apos;s what a typical analysis looks like:
        </p>
      )}

      <div className="glass-card text-left">
        {/* Title */}
        <h3 className="font-display text-lg font-semibold text-foreground">
          {data.ideaTitle}
        </h3>

        {/* Market Size */}
        <div
          className={`mt-6 transition-all duration-500 ${
            phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            Market Size
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold text-foreground">
              <AnimatedCounter target={data.marketSize.value} />
            </span>
            <span className="flex items-center gap-1 text-sm text-success">
              <TrendingUp className="h-3.5 w-3.5" />
              {data.marketSize.growth}
            </span>
          </div>
        </div>

        {/* Competitors */}
        <div
          className={`mt-6 transition-all duration-500 ${
            phase >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            Top Competitors
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {data.competitors.map((comp, i) => {
              const ThreatIcon = threatIcons[comp.threat];
              return (
                <div
                  key={comp.name}
                  className="rounded-xl border border-border bg-background/50 p-3 transition-all duration-300"
                  style={{
                    transitionDelay: phase >= 3 ? `${i * 150}ms` : '0ms',
                    opacity: phase >= 3 ? 1 : 0,
                    transform: phase >= 3 ? 'translateX(0)' : 'translateX(-10px)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <ThreatIcon className={`h-3.5 w-3.5 ${threatColors[comp.threat]}`} />
                    <span className="text-sm font-medium text-foreground">
                      {comp.name}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{comp.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timing Verdict */}
        <div
          className={`mt-6 transition-all duration-500 ${
            phase >= 4 ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Timing
          </div>
          <div className="mt-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${verdictColors[data.timingVerdict.color]}`}
            >
              {data.timingVerdict.label}
            </span>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.timingVerdict.reasoning}
            </p>
          </div>
        </div>

        {/* Viability Score */}
        <div
          className={`mt-6 flex items-center justify-between border-t border-border/50 pt-5 transition-all duration-500 ${
            phase >= 5 ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          <span className="text-sm font-medium text-muted-foreground">
            Viability Score
          </span>
          <div className="flex items-baseline gap-1">
            <span className={`font-display text-3xl font-bold ${scoreColor}`}>
              <AnimatedScore target={data.viabilityScore} />
            </span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
        </div>
      </div>
    </div>
  );
}
