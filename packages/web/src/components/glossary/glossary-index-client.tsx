'use client';

import { useState, useMemo } from 'react';
import { GlossaryTermCard } from './glossary-term-card';
import { GlossaryAlphabetNav } from './glossary-alphabet-nav';
import { CATEGORY_LABELS, type GlossaryCategory, type GlossaryTerm, type AlphabetGroup } from '@/lib/glossary';

interface GlossaryIndexClientProps {
  terms: GlossaryTerm[];
  alphabetGroups: AlphabetGroup[];
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as GlossaryCategory[];

export function GlossaryIndexClient({ terms, alphabetGroups }: GlossaryIndexClientProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredTerms = useMemo(() => {
    let result = terms;
    if (activeCategory) {
      result = result.filter((t) => t.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.shortDefinition.toLowerCase().includes(q)
      );
    }
    return result;
  }, [terms, search, activeCategory]);

  const filteredGroups = useMemo(() => {
    const groups = new Map<string, GlossaryTerm[]>();
    for (const term of filteredTerms) {
      const letter = term.title[0].toUpperCase();
      if (!groups.has(letter)) groups.set(letter, []);
      groups.get(letter)!.push(term);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letter, terms]) => ({ letter, terms }));
  }, [filteredTerms]);

  const activeLetters = filteredGroups.map((g) => g.letter);

  return (
    <>
      {/* Search */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search terms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-full border border-[#333] bg-[#1c1b19] px-5 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors focus:border-[#E8513D]/50"
        />
      </div>

      {/* Category filter */}
      <nav className="mb-12 flex flex-wrap gap-2" aria-label="Filter by category">
        <button
          onClick={() => setActiveCategory(null)}
          className={`
            px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200
            ${!activeCategory
              ? 'bg-white text-[#0A0A0A]'
              : 'text-[#928e87] border border-[#333] hover:border-[#555] hover:text-white'
            }
          `}
        >
          All
        </button>
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`
              px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200
              ${activeCategory === cat
                ? 'bg-white text-[#0A0A0A]'
                : 'text-[#928e87] border border-[#333] hover:border-[#555] hover:text-white'
              }
            `}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </nav>

      {/* Term list + alphabet nav */}
      <div className="flex gap-8">
        <div className="min-w-0 flex-1">
          {filteredGroups.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-lg text-[#928e87]">
                No terms found. Try a different search or category.
              </p>
            </div>
          ) : (
            filteredGroups.map(({ letter, terms }) => (
              <section key={letter} id={`glossary-letter-${letter}`} className="mb-10">
                <h2 className="mb-4 font-display text-3xl font-extrabold text-white">{letter}</h2>
                <div className="flex flex-col gap-3">
                  {terms.map((term) => (
                    <GlossaryTermCard
                      key={term.slug}
                      slug={term.slug}
                      title={term.title}
                      shortDefinition={term.shortDefinition}
                      category={term.category}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        <GlossaryAlphabetNav activeLetters={activeLetters} />
      </div>
    </>
  );
}
