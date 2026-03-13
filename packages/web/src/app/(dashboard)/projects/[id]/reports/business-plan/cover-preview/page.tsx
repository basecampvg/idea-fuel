'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { COVER_VARIANTS } from '../components/cover-variants';

const SAMPLE_TITLE = 'AI-Powered Supply Chain Optimization Platform';
const SAMPLE_SUBTITLE = 'Revolutionizing logistics through predictive intelligence';

export default function CoverPreviewPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-8">
        <Link
          href=".."
          className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-300 transition-colors mb-8"
          style={{ fontSize: '14px' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Report
        </Link>
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">
          Cover Design Variations
        </h1>
        <p className="text-neutral-500 mt-2 text-sm">
          4 directions using IdeaFuel brand elements. Each can drop in as the cover page.
        </p>
      </div>
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {COVER_VARIANTS.map(({ id, name, Component }) => (
            <div key={id} className="group">
              <div
                className="relative overflow-hidden rounded-xl border border-neutral-800 group-hover:border-neutral-600 transition-colors"
                style={{ aspectRatio: '210 / 297' }}
              >
                <div className="absolute inset-0">
                  <Component title={SAMPLE_TITLE} subtitle={SAMPLE_SUBTITLE} />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-3">
                <span className="font-mono text-neutral-600 tabular-nums" style={{ fontSize: '12px' }}>
                  {String(id).padStart(2, '0')}
                </span>
                <h3 className="text-sm font-semibold text-neutral-200">{name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
