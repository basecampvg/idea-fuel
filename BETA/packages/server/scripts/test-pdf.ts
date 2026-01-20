import { generatePDFBuffer, getPDFFilename } from '../src/lib/pdf';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Testing PDF generation...');

  try {
    const pdfBuffer = await generatePDFBuffer({
      idea: {
        id: 'test-id',
        title: 'AI-Powered Invoice Processing Tool',
        description: 'An automated invoice processing solution that uses AI to extract data from invoices, validate information, and integrate with accounting systems.',
      },
      report: {
        id: 'report-id',
        type: 'BUSINESS_PLAN',
        tier: 'PRO',
        title: 'Business Plan',
        content: JSON.stringify({
          executiveSummary: 'This is a comprehensive business plan for an AI-powered invoice processing solution.',
          problem: 'Manual invoice processing is time-consuming and error-prone.',
          solution: 'Our AI-powered tool automates the entire invoice processing workflow.',
          targetMarket: 'Small to medium-sized businesses with high invoice volumes.',
          revenueStreams: ['SaaS subscriptions', 'Enterprise licensing', 'API access'],
        }),
        sections: { included: ['summary', 'analysis'], locked: [] },
      },
      research: null,
    });

    const filename = getPDFFilename('AI-Powered Invoice Processing Tool', 'BUSINESS_PLAN');
    const outputPath = path.join(__dirname, filename);

    fs.writeFileSync(outputPath, pdfBuffer);
    console.log(`PDF generated successfully: ${outputPath}`);
    console.log(`File size: ${pdfBuffer.length} bytes`);
  } catch (error) {
    console.error('PDF generation failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

main();
