import { NextResponse } from 'next/server';
import { writeFileSync, existsSync } from 'fs';
import path from 'path';
import { getPatternById } from '@/app/(dashboard)/design-system/lib/pattern-registry';

export const dynamic = 'force-dynamic';

const COMPONENTS_DIR = path.join(process.cwd(), 'src/components/ui');

// ---------------------------------------------------------------------------
// POST /api/dev/extract-component — Generate a component file from a pattern
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { patternId, overwrite } = body as { patternId: string; overwrite?: boolean };

    if (!patternId) {
      return NextResponse.json({ error: 'Missing patternId' }, { status: 400 });
    }

    const pattern = getPatternById(patternId);
    if (!pattern) {
      return NextResponse.json({ error: `Unknown pattern: ${patternId}` }, { status: 404 });
    }

    const outputPath = path.join(COMPONENTS_DIR, pattern.fileName);

    // Check if file already exists
    if (existsSync(outputPath) && !overwrite) {
      return NextResponse.json({
        error: 'Component file already exists. Use overwrite: true to replace.',
        path: `components/ui/${pattern.fileName}`,
        exists: true,
      }, { status: 409 });
    }

    // Generate the component source
    const source = pattern.generateSource();

    // Write to disk
    writeFileSync(outputPath, source, 'utf-8');

    return NextResponse.json({
      success: true,
      path: `components/ui/${pattern.fileName}`,
      componentName: pattern.suggestedName,
    });
  } catch (error) {
    console.error('[Dev Extract Component Error]', error);
    return NextResponse.json(
      { error: 'Failed to extract component' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/dev/extract-component?check=patternId — Check if component exists
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const patternId = searchParams.get('check');

  if (!patternId) {
    // Return status of all patterns
    const { PATTERNS } = await import('@/app/(dashboard)/design-system/lib/pattern-registry');
    const results = PATTERNS.map((p) => ({
      id: p.id,
      name: p.suggestedName,
      fileName: p.fileName,
      exists: existsSync(path.join(COMPONENTS_DIR, p.fileName)),
    }));
    return NextResponse.json({ patterns: results });
  }

  const pattern = getPatternById(patternId);
  if (!pattern) {
    return NextResponse.json({ error: `Unknown pattern: ${patternId}` }, { status: 404 });
  }

  const exists = existsSync(path.join(COMPONENTS_DIR, pattern.fileName));
  return NextResponse.json({
    id: pattern.id,
    name: pattern.suggestedName,
    path: `components/ui/${pattern.fileName}`,
    exists,
  });
}
