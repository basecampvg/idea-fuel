/**
 * Split a single capture-input string into one or more distinct thoughts.
 *
 * The user types or pastes free-form text; we want to honor explicit thought
 * boundaries they signaled with paragraph breaks or list markers, without
 * mangling a single thought that happens to wrap onto multiple lines.
 *
 * Rules:
 *   1. Split on blank lines (paragraph boundaries).
 *   2. Inside a paragraph, if EVERY line begins with a bullet/number marker
 *      (`-`, `*`, `•`, `1.`, `2)`, etc.), treat each line as its own thought.
 *   3. Strip leading bullet/number markers from each emitted thought.
 *   4. Drop empty/whitespace-only fragments.
 *
 * A single line of prose with no markers always returns one thought, even if
 * it contains soft line breaks within a paragraph.
 */
export function splitThoughts(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const bulletRe = /^\s*(?:[-*•]|\d+[.)])\s+/;
  const stripBullet = (s: string) => s.replace(bulletRe, '').trim();

  const paragraphs = trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const out: string[] = [];
  for (const para of paragraphs) {
    const lines = para.split(/\n/).map((l) => l.trim()).filter(Boolean);
    const allBulleted = lines.length > 1 && lines.every((l) => bulletRe.test(l));
    if (allBulleted) {
      for (const line of lines) out.push(stripBullet(line));
    } else {
      out.push(stripBullet(para));
    }
  }

  return out.filter((t) => t.length > 0);
}
