'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';

interface ParallaxContainerProps {
  children: ReactNode;
  /** Depth multiplier: 0.5 = slow/far, 1.0 = mid, 1.5 = close/fast */
  rate?: number;
  /** Maximum displacement in pixels */
  maxDisplacement?: number;
  className?: string;
}

const SPRING_CONFIG = { stiffness: 50, damping: 20 };

/**
 * Wraps children in mouse-tracking parallax.
 * Disabled on touch devices and narrow viewports.
 */
export function ParallaxContainer({
  children,
  rate = 1,
  maxDisplacement = 25,
  className = '',
}: ParallaxContainerProps) {
  const prefersReducedMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING_CONFIG);
  const springY = useSpring(y, SPRING_CONFIG);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const isNarrow = window.innerWidth < 768;
    if (isTouch || isNarrow) {
      setEnabled(false);
      return;
    }
    setEnabled(true);

    function handleMouseMove(e: MouseEvent) {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const dx = ((e.clientX - centerX) / centerX) * maxDisplacement * rate;
      const dy = ((e.clientY - centerY) / centerY) * maxDisplacement * rate;
      x.set(dx);
      y.set(dy);
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [prefersReducedMotion, x, y, rate, maxDisplacement]);

  if (!enabled || prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} style={{ x: springX, y: springY }}>
      {children}
    </motion.div>
  );
}

/**
 * Floating decorative gradient orbs for the landing page.
 * Each orb is wrapped in parallax at different depth rates.
 */
export function FloatingElements() {
  const prefersReducedMotion = useReducedMotion();

  const orbs = [
    { size: 300, color: 'glow-orb-primary', style: { top: '5%', right: '5%' }, rate: 0.5 },
    { size: 200, color: 'glow-orb-accent', style: { top: '30%', left: '3%' }, rate: 1.0 },
    { size: 250, color: 'glow-orb-warm', style: { top: '55%', right: '10%' }, rate: 0.5 },
    { size: 350, color: 'glow-orb-primary', style: { top: '70%', left: '8%' }, rate: 0.5 },
    { size: 150, color: 'glow-orb-accent', style: { top: '88%', right: '15%' }, rate: 1.5 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {orbs.map((orb, i) => (
        <div key={i} className="absolute" style={orb.style}>
          <ParallaxContainer rate={prefersReducedMotion ? 0 : orb.rate}>
            <div
              className={`glow-orb ${orb.color}`}
              style={{ width: orb.size, height: orb.size }}
            />
          </ParallaxContainer>
        </div>
      ))}
    </div>
  );
}
