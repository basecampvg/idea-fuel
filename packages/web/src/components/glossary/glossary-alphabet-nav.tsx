'use client';

interface GlossaryAlphabetNavProps {
  activeLetters: string[];
}

export function GlossaryAlphabetNav({ activeLetters }: GlossaryAlphabetNavProps) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  function scrollToLetter(letter: string) {
    const el = document.getElementById(`glossary-letter-${letter}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <nav
      className="sticky top-[100px] hidden flex-col gap-1 xl:flex"
      aria-label="Alphabetical navigation"
    >
      {alphabet.map((letter) => {
        const isActive = activeLetters.includes(letter);
        return (
          <button
            key={letter}
            onClick={() => scrollToLetter(letter)}
            disabled={!isActive}
            className={`
              h-7 w-7 rounded text-xs font-medium transition-all duration-150
              ${isActive
                ? 'text-white hover:bg-[#333] hover:text-white cursor-pointer'
                : 'text-[#555] cursor-default'
              }
            `}
          >
            {letter}
          </button>
        );
      })}
    </nav>
  );
}
