/**
 * Demo Business Plan PDF Export (public, no auth)
 *
 * GET /api/research/business-plan/demo-export
 *
 * Generates a PDF from the demo project for the landing page sample download.
 */

import puppeteer from 'puppeteer-core';

export const maxDuration = 60;

// Demo project ID — the ConstructIQ sample report
const DEMO_PROJECT_ID = '5c62a6ff-9248-4a49-b8f6-61810ace091f';
const DEMO_COVER_STYLE = '2';

// Simple IP-based rate limit: 3 per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

async function getBrowser() {
  if (process.env.NODE_ENV === 'production' || process.env.CHROMIUM_SERVERLESS === 'true') {
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 900 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

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

export async function GET(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || 'http://localhost:3006';
    const reportUrl = `${baseUrl}/print/business-plan/${DEMO_PROJECT_ID}?cover=${DEMO_COVER_STYLE}`;

    // Forward cookies from the request so the print page can load data
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

    await page.setViewport({ width: 794, height: 1123 });
    await page.goto(reportUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('#business-plan-report', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    await browser.close();
    browser = null;

    return new Response(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="IdeaFuel-Sample-Business-Plan.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[Demo PDF Export] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}
