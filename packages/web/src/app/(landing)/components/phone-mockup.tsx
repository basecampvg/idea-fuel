'use client';

import { Home, Mic, Settings, ShieldCheck } from 'lucide-react';

export function PhoneMockup({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {/* Container — sized to match the iPhone frame aspect ratio (633×1309) */}
      <div className="relative mx-auto w-[300px]">
        {/* iPhone 16 Pro frame image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/phone/iphone-frame.png"
          alt=""
          className="relative z-0 block h-auto w-full pointer-events-none select-none"
          draggable={false}
        />

        {/* Screen content — overlaid on top of the frame's screen area */}
        <div
          className="absolute z-10 flex flex-col overflow-hidden"
          style={{ top: '7%', left: '6%', right: '6%', bottom: '4%' }}
        >
          {/* Header — IDEA FUEL */}
          <div className="mt-[10px] mb-1 w-full pb-2 text-center">
            <span className="font-mono text-[13px] tracking-[4px] text-[#bcbcbc]">
              IDEA{' '}
            </span>
            <span className="font-mono text-[13px] tracking-[4px] text-[#e32b1a]">
              FUEL
            </span>
          </div>

          {/* Flame logo — large and centered */}
          <div className="flex flex-1 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ideafuel-logo.svg"
              alt="Idea Fuel flame"
              className="h-[175px] w-auto drop-shadow-[0_0_50px_rgba(227,43,26,0.4)]"
              draggable={false}
            />
          </div>

          {/* DON'T LET YOUR IDEAS DIE — text with "DIE" in red */}
          <p className="-mt-2 mb-4 text-center font-mono text-[10px] tracking-[3px] text-[#bcbcbc]">
            DON&apos;T LET YOUR IDEAS{' '}
            <span className="text-[#e32b1a]">DIE</span>
          </p>

          {/* Soundwave — infinite scroll ticker */}
          <div className="mb-4 w-full overflow-hidden" aria-hidden="true">
            <div className="flex w-max animate-[waveform-scroll_8s_linear_infinite]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/phone/soundwave.svg"
                alt=""
                className="h-[55px] w-[553px] shrink-0"
                draggable={false}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/phone/soundwave.svg"
                alt=""
                className="h-[55px] w-[553px] shrink-0"
                draggable={false}
              />
            </div>
          </div>

          {/* Record button with pulse */}
          <div className="relative mb-1 flex items-center justify-center">
            <span className="absolute h-[62px] w-[62px] animate-[record-pulse_2s_ease-out_infinite] rounded-full bg-[#e32b1a]/25" />
            <span className="absolute h-[62px] w-[62px] animate-[record-pulse_2s_ease-out_0.6s_infinite] rounded-full bg-[#e32b1a]/15" />
            <button
              type="button"
              aria-label="Record"
              className="relative z-10 flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[#e32b1a] shadow-[0_0_30px_rgba(227,43,26,0.6)]"
            >
              <Mic className="h-5 w-5 text-white" strokeWidth={2} />
            </button>
          </div>

          {/* Recording label */}
          <p className="mb-3 text-center font-mono text-[8px] tracking-[2px] text-[#888]">
            recording
          </p>

          {/* Bottom nav — Settings, Home, Vault */}
          <div className="flex w-full items-center justify-center gap-10 border-t border-[#333] pt-3 pb-1">
            <Settings className="h-5 w-5 text-[#555]" strokeWidth={1.5} />
            <Home className="h-5 w-5 text-[#555]" strokeWidth={1.5} />
            <ShieldCheck className="h-5 w-5 text-[#555]" strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </div>
  );
}
