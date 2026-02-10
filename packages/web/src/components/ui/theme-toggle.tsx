'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors"
        aria-label="Toggle theme"
      >
        <Sun className="h-5 w-5" strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)] transition-colors"
      aria-label="Toggle theme"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" strokeWidth={1.5} />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" strokeWidth={1.5} />
    </button>
  );
}
