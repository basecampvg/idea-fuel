/**
 * Business Plan PDF Export
 *
 * POST /api/research/business-plan/export
 *
 * Launches headless Chromium, navigates to the business plan report page
 * in print mode, and returns a PDF.
 *
 * Uses puppeteer-core + @sparticuz/chromium for serverless (Vercel) compatibility.
 * Falls back to local Chrome for development.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, schema } from '@forge/server';
import { eq } from 'drizzle-orm';
import puppeteer from 'puppeteer-core';

// Allow up to 60s for PDF generation
export const maxDuration = 60;

// Rate limit: max 5 PDF exports per user per 10 minutes
const PDF_RATE_LIMIT_WINDOW = 10 * 60 * 1000;
const PDF_RATE_LIMIT_MAX = 5;
const pdfRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkPdfRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = pdfRateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    pdfRateLimitMap.set(userId, { count: 1, resetAt: now + PDF_RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= PDF_RATE_LIMIT_MAX) {
    return false;
  }
  entry.count++;
  return true;
}

async function getBrowser() {
  if (process.env.NODE_ENV === 'production' || process.env.CHROMIUM_SERVERLESS === 'true') {
    // Serverless: use @sparticuz/chromium
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 900 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // Local dev: find Chrome on the system
  const executablePath =
    process.platform === 'win32'
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : '/usr/bin/google-chrome';

  return puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

export async function POST(req: Request) {
  // 1. Auth
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1b. Rate limit
  if (!checkPdfRateLimit(userId)) {
    return NextResponse.json(
      { error: 'Too many export requests. Please wait a few minutes.' },
      { status: 429 },
    );
  }

  // 2. Parse body
  let body: { researchId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { researchId } = body;
  if (!researchId) {
    return NextResponse.json({ error: 'researchId is required' }, { status: 400 });
  }

  // 3. Verify ownership + business plan exists
  const research = await db.query.research.findFirst({
    where: eq(schema.research.id, researchId),
    columns: { id: true, businessPlan: true, projectId: true, businessPlanCoverStyle: true },
    with: {
      project: { columns: { userId: true, title: true } },
    },
  });

  if (!research) {
    return NextResponse.json({ error: 'Research not found' }, { status: 404 });
  }
  if (research.project.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!research.businessPlan) {
    return NextResponse.json({ error: 'Business plan not generated yet' }, { status: 400 });
  }

  // 4. Generate PDF via Puppeteer
  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();

    // Build the URL to the report page with print param
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || 'http://localhost:3006';
    const coverStyle = research.businessPlanCoverStyle || '1';
    const reportUrl = `${baseUrl}/projects/${research.projectId}/reports/business-plan/print?cover=${coverStyle}`;

    // Set auth cookie so the page can load authenticated content
    // We pass the session cookie from the incoming request
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map((c) => {
        const [name, ...rest] = c.trim().split('=');
        return {
          name,
          value: rest.join('='),
          domain: new URL(baseUrl).hostname,
          path: '/',
        };
      });
      await page.setCookie(...cookies);
    }

    // Navigate and wait for content to render
    await page.goto(reportUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for the report container to be present
    await page.waitForSelector('#business-plan-report', { timeout: 15000 });

    // Small delay for charts to finish rendering
    await new Promise((r) => setTimeout(r, 2000));

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0.5in', left: '0' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; font-size: 7px; color: #666; display: flex; justify-content: space-between; padding: 0 0.75in;">
          <span>${research.project.title ?? 'Business Plan'} &mdash; Confidential</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
    });

    await browser.close();
    browser = null;

    // Sanitize filename
    const safeTitle = (research.project.title ?? 'Business-Plan')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60);

    return new Response(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeTitle}-Business-Plan.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[PDF Export] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 },
    );
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}
