'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export function FlameHero({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      gsap.to(containerRef.current, {
        y: -8,
        duration: 3,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/ideafuel-logo.svg"
        alt="Idea Fuel flame"
        className="h-full w-full object-contain drop-shadow-[0_0_80px_rgba(227,43,26,0.3)]"
        draggable={false}
      />
    </div>
  );
}
