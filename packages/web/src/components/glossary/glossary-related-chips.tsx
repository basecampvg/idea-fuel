import Link from 'next/link';
import { getAllTerms } from '@/lib/glossary';

interface GlossaryRelatedChipsProps {
  slugs: string[];
}

export function GlossaryRelatedChips({ slugs }: GlossaryRelatedChipsProps) {
  const allTerms = getAllTerms();
  const related = slugs
    .map((slug) => allTerms.find((t) => t.slug === slug))
    .filter(Boolean);

  if (related.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {related.map((term) => (
        <Link
          key={term!.slug}
          href={`/glossary/${term!.slug}`}
          className="rounded-full border border-[#333] px-3.5 py-1.5 text-[13px] font-medium text-[#928e87] transition-all duration-200 hover:border-[#555] hover:text-white"
        >
          {term!.title}
        </Link>
      ))}
    </div>
  );
}
