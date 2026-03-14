'use client';

// ============================================================================
// Shared Cover Variants for Positioning Reports
// Same 4 designs as business plan, with "Positioning Strategy" label
// ============================================================================

export interface CoverProps {
  title: string;
  subtitle?: string;
}

export function formatCoverDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const TODAY = formatCoverDate(new Date());

// ============================================================================
// Version 1: Bold Geometric
// ============================================================================

export function CoverV1({ title, subtitle }: CoverProps) {
  return (
    <div
      className="relative flex flex-col justify-between w-full h-full overflow-hidden"
      style={{ backgroundColor: '#161513' }}
    >
      <img
        src="/ideafuel-logo.svg"
        alt=""
        className="absolute pointer-events-none select-none"
        style={{
          top: '8%',
          right: '-8%',
          height: '72%',
          opacity: 0.06,
          filter: 'grayscale(100%) brightness(2)',
        }}
      />
      <div
        className="absolute"
        style={{
          top: 0,
          right: '28%',
          width: '1px',
          height: '35%',
          background: 'linear-gradient(to bottom, #E32B1A, transparent)',
          opacity: 0.3,
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: '22%',
          left: 0,
          width: '65%',
          height: '1px',
          background: 'linear-gradient(to right, #E32B1A, transparent)',
          opacity: 0.5,
        }}
      />
      <div className="flex justify-between items-start p-[8%]">
        <div />
        <div className="text-right">
          <p
            className="font-mono uppercase text-neutral-500"
            style={{ fontSize: '0.55em', letterSpacing: '0.25em' }}
          >
            Prepared by
          </p>
          <p className="font-bold text-neutral-300 mt-1" style={{ fontSize: '0.85em' }}>
            <span style={{ color: '#E32B1A' }}>IDEA</span>FUEL
          </p>
        </div>
      </div>
      <div className="flex-1" />
      <div className="px-[8%] pb-[6%]">
        <div
          className="mb-4"
          style={{
            width: '3em',
            height: '3px',
            background: 'linear-gradient(to right, #E32B1A, #DB4D40)',
            borderRadius: '2px',
          }}
        />
        <h1
          className="font-display font-extrabold text-white leading-[1.05] tracking-tight"
          style={{ fontSize: '2.4em', maxWidth: '85%' }}
        >
          {title}
        </h1>
        <p
          className="font-light text-neutral-400 mt-3 leading-relaxed"
          style={{ fontSize: '0.85em', maxWidth: '70%' }}
        >
          Positioning Strategy
        </p>
        {subtitle && (
          <p
            className="text-neutral-500 mt-1"
            style={{ fontSize: '0.7em', maxWidth: '70%' }}
          >
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex justify-between items-end px-[8%] pb-[6%]">
        <p className="text-neutral-600" style={{ fontSize: '0.55em' }}>
          {TODAY}
        </p>
        <div className="text-right">
          <p className="text-neutral-600" style={{ fontSize: '0.5em' }}>
            Confidential &mdash; For Intended Recipients Only
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Version 2: Editorial / Magazine
// ============================================================================

export function CoverV2({ title, subtitle }: CoverProps) {
  return (
    <div
      className="relative flex flex-col w-full h-full overflow-hidden"
      style={{ backgroundColor: '#161513' }}
    >
      <div
        className="absolute"
        style={{
          left: '7%',
          top: 0,
          bottom: 0,
          width: '2px',
          background: '#E32B1A',
        }}
      />
      <div
        className="absolute font-mono uppercase text-neutral-600"
        style={{
          left: 'calc(7% + 10px)',
          top: '12%',
          fontSize: '0.42em',
          letterSpacing: '0.5em',
          writingMode: 'vertical-lr',
          textOrientation: 'mixed',
        }}
      >
        Positioning Strategy
      </div>
      <div className="flex-1 flex flex-col justify-center" style={{ paddingLeft: '18%', paddingRight: '10%' }}>
        <p
          className="font-mono uppercase text-neutral-500 mb-4"
          style={{ fontSize: '0.48em', letterSpacing: '0.35em' }}
        >
          {TODAY}
        </p>
        <h1
          className="font-display tracking-tight text-white leading-[1.1]"
          style={{ fontSize: '2.1em', fontWeight: 600 }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-neutral-400 mt-4 leading-relaxed"
            style={{ fontSize: '0.75em', fontWeight: 300, maxWidth: '90%' }}
          >
            {subtitle}
          </p>
        )}
        <div
          className="mt-6"
          style={{
            width: '2.5em',
            height: '1px',
            backgroundColor: '#E32B1A',
            opacity: 0.6,
          }}
        />
      </div>
      <div style={{ paddingLeft: '18%', paddingRight: '10%', paddingBottom: '7%' }}>
        <div
          className="mb-4"
          style={{ width: '100%', height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }}
        />
        <div className="flex justify-between items-center">
          <p className="text-neutral-600" style={{ fontSize: '0.5em' }}>
            Confidential &mdash; For Intended Recipients Only
          </p>
          <p className="font-semibold text-neutral-400" style={{ fontSize: '0.7em' }}>
            <span style={{ color: '#E32B1A' }}>IDEA</span>FUEL
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Version 3: Gradient Bleed
// ============================================================================

export function CoverV3({ title, subtitle }: CoverProps) {
  return (
    <div
      className="relative flex flex-col justify-between w-full h-full overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #161513 0%, #161513 40%, #1a1210 60%, #E32B1A 100%)',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 85% 15%, rgba(227,43,26,0.35) 0%, transparent 55%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 95% 5%, rgba(219,77,64,0.25) 0%, transparent 40%)',
        }}
      />
      <img
        src="/ideafuel-logo.svg"
        alt=""
        className="absolute pointer-events-none select-none"
        style={{
          top: '6%',
          right: '5%',
          height: '28%',
          opacity: 0.15,
          filter: 'brightness(3) saturate(0)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
        }}
      />
      <div className="p-[8%]">
        <p className="font-bold text-white" style={{ fontSize: '0.85em' }}>
          <span style={{ color: '#E32B1A' }}>IDEA</span>FUEL
        </p>
      </div>
      <div className="flex-1 flex items-end px-[8%] pb-[4%]">
        <div
          className="w-full rounded-xl p-[6%]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <p
            className="font-mono uppercase text-neutral-400 mb-3"
            style={{ fontSize: '0.48em', letterSpacing: '0.3em' }}
          >
            Positioning Strategy
          </p>
          <h1
            className="font-display font-bold text-white leading-[1.1] tracking-tight"
            style={{ fontSize: '1.9em' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="text-neutral-300 mt-3 leading-relaxed"
              style={{ fontSize: '0.7em', fontWeight: 300, opacity: 0.8 }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-between items-center px-[8%] pb-[6%] pt-[3%]">
        <p className="text-white/40" style={{ fontSize: '0.5em' }}>
          {TODAY}
        </p>
        <p className="text-white/30" style={{ fontSize: '0.45em' }}>
          Confidential &mdash; For Intended Recipients Only
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Version 4: Split Composition
// ============================================================================

export function CoverV4({ title, subtitle }: CoverProps) {
  return (
    <div className="relative flex w-full h-full overflow-hidden">
      <div
        className="flex flex-col items-center justify-center relative"
        style={{
          width: '38%',
          background: 'linear-gradient(180deg, #E32B1A 0%, #C82617 100%)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 20px,
              rgba(0,0,0,0.04) 20px,
              rgba(0,0,0,0.04) 21px
            )`,
          }}
        />
        <img
          src="/ideafuel-logo.svg"
          alt=""
          className="relative"
          style={{
            height: '22%',
            filter: 'brightness(0) invert(1)',
            opacity: 0.9,
          }}
        />
        <div className="relative mt-6 text-center">
          <p
            className="font-display font-extrabold text-white leading-none"
            style={{ fontSize: '1.3em', letterSpacing: '0.12em' }}
          >
            IDEA
          </p>
          <p
            className="font-display font-light text-white/80 leading-none mt-1"
            style={{ fontSize: '1.3em', letterSpacing: '0.35em' }}
          >
            FUEL
          </p>
        </div>
      </div>
      <div
        className="flex flex-col justify-between relative"
        style={{ width: '62%', backgroundColor: '#161513' }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            left: 0,
            top: 0,
            bottom: 0,
            width: '40%',
            background: 'linear-gradient(to right, rgba(227,43,26,0.06), transparent)',
          }}
        />
        <div className="p-[10%]">
          <p
            className="font-mono uppercase text-neutral-600"
            style={{ fontSize: '0.45em', letterSpacing: '0.3em' }}
          >
            Positioning Strategy
          </p>
        </div>
        <div className="flex-1 flex flex-col justify-center px-[10%]">
          <h1
            className="font-display font-bold text-white leading-[1.12] tracking-tight"
            style={{ fontSize: '1.7em' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="text-neutral-400 mt-4 leading-relaxed"
              style={{ fontSize: '0.65em', fontWeight: 300 }}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div className="px-[10%] pb-[8%]">
          <div
            className="mb-3"
            style={{ width: '100%', height: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }}
          />
          <p className="text-neutral-600" style={{ fontSize: '0.48em' }}>
            {TODAY}
          </p>
          <p className="text-neutral-700 mt-1" style={{ fontSize: '0.42em' }}>
            Confidential &mdash; For Intended Recipients Only
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Variant Registry
// ============================================================================

export const COVER_VARIANTS = [
  { id: '1', name: 'Bold Geometric', Component: CoverV1 },
  { id: '2', name: 'Editorial', Component: CoverV2 },
  { id: '3', name: 'Gradient Bleed', Component: CoverV3 },
  { id: '4', name: 'Split Composition', Component: CoverV4 },
] as const;

export type CoverStyleId = '1' | '2' | '3' | '4';

export function getCoverComponent(styleId: string) {
  const variant = COVER_VARIANTS.find((v) => v.id === styleId);
  return variant?.Component ?? CoverV1;
}
