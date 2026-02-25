import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { parseTokens, applyChanges, computeHash } from '@/app/(dashboard)/design-system/lib/token-parser';
import type { SaveRequest } from '@/app/(dashboard)/design-system/lib/token-types';

export const dynamic = 'force-dynamic';

const GLOBALS_CSS_PATH = path.join(process.cwd(), 'src/app/globals.css');

// ---------------------------------------------------------------------------
// GET /api/dev/tokens — Parse and return all tokens
// ---------------------------------------------------------------------------

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  try {
    const content = readFileSync(GLOBALS_CSS_PATH, 'utf-8');
    const { tokens, fileHash } = parseTokens(content);

    return NextResponse.json({ tokens, fileHash });
  } catch (error) {
    console.error('[Dev Tokens GET Error]', error);
    return NextResponse.json(
      { error: 'Failed to parse tokens' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/dev/tokens — Save changes back to globals.css
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as SaveRequest;

    if (!body.changes || !Array.isArray(body.changes) || !body.fileHash) {
      return NextResponse.json(
        { error: 'Missing changes or fileHash' },
        { status: 400 },
      );
    }

    // Re-read file and check hash for concurrency
    const content = readFileSync(GLOBALS_CSS_PATH, 'utf-8');
    const currentHash = computeHash(content);

    if (currentHash !== body.fileHash) {
      return NextResponse.json(
        { error: 'File has changed since last load. Please refresh and try again.' },
        { status: 409 },
      );
    }

    // Parse, apply changes, write back
    const { tokens, lines } = parseTokens(content);
    const updatedLines = applyChanges(lines, tokens, body.changes);
    const newContent = updatedLines.join('\n');

    writeFileSync(GLOBALS_CSS_PATH, newContent, 'utf-8');

    const newFileHash = computeHash(newContent);

    return NextResponse.json({ success: true, newFileHash });
  } catch (error) {
    console.error('[Dev Tokens POST Error]', error);
    return NextResponse.json(
      { error: 'Failed to save tokens' },
      { status: 500 },
    );
  }
}
