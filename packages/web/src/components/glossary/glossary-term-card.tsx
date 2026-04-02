import Link from 'next/link';
import { CATEGORY_LABELS, type GlossaryCategory } from '@/lib/glossary';

interface GlossaryTermCardProps {
  slug: string;
  title: string;
  shortDefinition: string;
  category: string;
}

export function GlossaryTermCard({ slug, title, shortDefinition, category }: GlossaryTermCardProps) {
  const categoryLabel = CATEGORY_LABELS[category as GlossaryCategory] ?? category;

  return (
    <Link
      href={`/glossary/${slug}`}
      className="group flex items-start justify-between gap-4 rounded-xl border border-[#222] bg-[#1c1b19] px-5 py-4 transition-all duration-200 hover:border-[#E8513D]/30 hover:shadow-[0_0_40px_-12px_rgba(232,81,61,0.1)]"
    >
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold text-white transition-colors group-hover:text-[#E8513D]">
          {title}
        </h3>
        <p className="mt-1 line-clamp-1 text-sm text-[#928e87]">{shortDefinition}</p>
      </div>
      <span className="mt-0.5 shrink-0 rounded-full border border-[#333] px-2.5 py-0.5 text-[11px] font-medium text-[#928e87]">
        {categoryLabel}
      </span>
    </Link>
  );
}
