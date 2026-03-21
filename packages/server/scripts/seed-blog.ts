import { db } from '../src/db/drizzle';
import { blogPosts, users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const samplePosts = [
  {
    slug: 'why-we-built-ideafuel',
    title: 'Why We Built IdeaFuel (And Who It\'s Really For)',
    description: 'I spent years drowning in ideas but starving for a way to act on them. IdeaFuel is the platform I wish existed when I needed it most.',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'I need to tell you something before we get into what IdeaFuel is, what it does, and why you should care. I need to tell you who I was before I built it. Because if I skip that part — if I just hand you the feature list and pretend this platform appeared fully formed — I\'m doing the same thing every other SaaS landing page does. I\'m selling you the highlight reel and hiding the footage that actually matters.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'The Guy With a Thousand Ideas and Zero Businesses' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'I\'m a creative. Always have been. The kind of mind that never shuts off — that sees opportunity in everything, that generates business concepts the way most people generate small talk. Road trips were the worst. Something about the open road would crack open a floodgate in my head and ideas would pour through faster than I could capture them. I\'d pull over to type frantic notes into my phone. I\'d arrive at my destination with a dozen new concepts and the buzzing, restless energy of someone who just saw the future but couldn\'t figure out how to get there.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'That last part is the part nobody talks about. Coming up with ideas was never my problem. What I didn\'t have was a way through the wall that stood between the spark and the thing the spark was supposed to become.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'The Wall' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'You know the wall. You have an idea — a real one, not some passing thought, but something that makes your chest tight with possibility. You can see the product, the customer, the brand, the life it could give you. For a few hours, maybe a few days, you\'re invincible.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Then the questions start. Is this idea even good? Has someone already built this? How do I know if people will actually pay for it? Do I build a website? Write a business plan? Talk to customers? Where do I even find customers? How do I research a market I know nothing about?',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'It\'s not one question. It\'s a hundred questions hitting you simultaneously, and every single one feels urgent and unanswerable. The excitement curdles into overwhelm. The overwhelm hardens into paralysis. And the paralysis whispers the most dangerous sentence an entrepreneur can hear: "Maybe I\'m not ready yet."',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'So the idea quietly dies in a notes app you\'ll never open again. I know this cycle because I lived inside it for years.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Then AI Changed Everything (Almost)' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'The first time I sat down with an AI tool and asked it to help me think through a business idea — not generate a logo, not write a tagline, but actually think, analyze, and challenge — something shifted. I gave it a concept I\'d been sitting on for months. Within minutes, I had a preliminary market analysis. Within an hour, a competitive landscape and a pricing framework. Within a day, more strategic clarity than I\'d achieved in months on my own.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'AI collapsed the distance between having an idea and understanding whether that idea was worth pursuing. What used to take weeks took hours. What used to require hiring a consultant took a well-crafted prompt and thirty minutes of focused work.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'So I went all in. I started running every idea through AI-powered research and validation. I built business plans in days instead of months. I stress-tested assumptions in hours instead of quarters.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'And then I hit a new wall.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'The Chaos Problem' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Here\'s what nobody warns you about when you start using AI for serious business development: the output is extraordinary, but the organization is a nightmare. Market research in one platform. Financial models in another. Business plan draft in a Google Doc. Competitive analysis in a chat thread you can\'t find. Product requirements scattered across three different tools.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'I\'d solved the creativity-to-action gap only to create a different problem: I could generate incredible strategic work, but I couldn\'t keep it organized, connected, or structured into a coherent pipeline. The pieces were brilliant individually. Together, they were chaos.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [{ type: 'bold' }],
              text: 'The tools existed, but the system didn\'t.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'So We Built the System' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'IdeaFuel is the platform I wish I\'d had. It\'s the pipeline that takes you from "I have an idea" to "I have a validated business plan" — in one place, powered by AI that actually understands what entrepreneurs need.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Here\'s what it does:',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [{ type: 'bold' }],
              text: 'Idea Capture & Organization.',
            },
            {
              type: 'text',
              text: ' Every idea gets a home. No more scattered notes across five apps. Capture your concepts, tag them, and come back to them when you\'re ready to dig deeper.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [{ type: 'bold' }],
              text: 'AI-Powered Research.',
            },
            {
              type: 'text',
              text: ' Feed IdeaFuel your idea and it generates market analysis, competitive landscapes, demand signals, and customer insights — automatically. The kind of research that used to cost $50K from a consulting firm, done in minutes.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [{ type: 'bold' }],
              text: 'Validation Pipeline.',
            },
            {
              type: 'text',
              text: ' Research feeds into validation. Validation feeds into strategy. Strategy feeds into planning. Each stage builds on the last. No more starting from scratch every time you open a new tool.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [{ type: 'bold' }],
              text: 'Business Plan Generation.',
            },
            {
              type: 'text',
              text: ' When you\'re ready, IdeaFuel compiles everything — your research, your validation data, your strategic decisions — into a structured business plan. Not a generic template. A plan built from your actual data and analysis.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Who This Is For' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'IdeaFuel is for the person with a thousand ideas and no pipeline. The first-time founder who doesn\'t know where to start. The serial entrepreneur who\'s tired of reinventing their process for every new concept. The side-hustler who has exactly two hours on a Saturday morning and needs to make them count.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'It\'s for the person who\'s smart enough to have the idea but hasn\'t had the system to do something about it. That was me. If it\'s you too, you\'re in the right place.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'What Comes Next' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'We\'re just getting started. This blog is where we\'ll share the frameworks, strategies, and hard-won lessons that IdeaFuel is built on. Practical, actionable content for founders who want to move faster and build smarter. No motivational fluff. No vague principles. Just the stuff that works.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'If you\'ve been sitting on an idea — or twenty ideas — stop letting them die in your notes app. Sign up, capture what\'s been keeping you up at night, and let\'s see what it becomes.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'I was a guy with a thousand ideas and no pipeline. Now I\'m a founder who builds them. IdeaFuel is how.',
            },
          ],
        },
      ],
    },
    status: 'PUBLISHED' as const,
    publishedAt: new Date('2026-02-14T09:00:00Z'),
    readingTime: '7 min read',
    wordCount: 1150,
    tags: ['Founder Story', 'Product Updates', 'IdeaFuel'],
  },
];

async function main() {
  console.log('Seeding sample blog posts...\n');

  // Find the first admin user to use as author
  const author = await db.query.users.findFirst({
    columns: { id: true, name: true, role: true },
  });

  if (!author) {
    console.error('No users found in the database. Please create a user first.');
    process.exit(1);
  }

  console.log(`Using author: ${author.name} (${author.id})\n`);

  for (const post of samplePosts) {
    // Check if slug already exists
    const existing = await db.query.blogPosts.findFirst({
      where: eq(blogPosts.slug, post.slug),
      columns: { id: true },
    });

    if (existing) {
      console.log(`  Skipping "${post.title}" (slug already exists)`);
      continue;
    }

    await db.insert(blogPosts).values({
      ...post,
      authorId: author.id,
    });

    console.log(`  Created: "${post.title}"`);
  }

  console.log('\nDone! Visit /blog to see the posts.');
}

main()
  .catch((e) => {
    console.error('Error seeding blog posts:', e);
    process.exit(1);
  });
