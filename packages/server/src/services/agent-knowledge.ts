/**
 * Agent Product Knowledge Base
 *
 * Static knowledge about Forge features, modes, and concepts.
 * Used by the explainFeature tool to answer product questions
 * without needing to hit the database or embeddings.
 */

const KNOWLEDGE_BASE: Record<string, string> = {
  'interview modes': `Forge offers three interview modes:
- **Lightning**: No interview — AI generates analysis directly from your project description. Best for quick validation.
- **Light**: Quick discovery interview, up to 5 turns. Good for refining your idea with AI guidance.
- **In-Depth**: Comprehensive interview, up to 15 turns. Deep exploration of your business idea for thorough analysis.`,

  'report types': `Forge generates several report types:
- **Business Plan**: Complete business plan with executive summary, market analysis, financial projections
- **Positioning**: Brand positioning and differentiation strategy
- **Competitive Analysis**: Deep dive into competitor landscape
- **Why Now**: Timing analysis — why this idea works right now
- **Proof Signals**: Social proof and market validation evidence
- **Keywords & SEO**: Keyword research and SEO opportunity analysis
- **Customer Profile**: Target customer personas and segments
- **Value Equation**: Value proposition breakdown
- **Value Ladder**: Pricing and product tier strategy
- **Go-to-Market**: Launch and growth strategy`,

  'report tiers': `Reports come in three quality tiers:
- **Basic**: Core insights, available with Lightning mode or FREE + Light interview
- **Pro**: Enhanced analysis with deeper research, available with PRO + Light or FREE + In-Depth
- **Full**: Comprehensive reports with all sections unlocked, requires PRO/Enterprise + In-Depth interview`,

  'research pipeline': `The research pipeline has several phases:
1. **Query Generation**: AI generates targeted search queries based on your idea
2. **Deep Research**: Multiple parallel deep research calls gather market data
3. **Synthesis**: Raw research is synthesized into structured insights
4. **Social Research**: Supplementary social proof and trend data
5. **Report Generation**: Final reports are generated from synthesized data
6. **Business Plan**: Optional detailed business plan generation

The entire pipeline typically takes 5-15 minutes depending on depth.`,

  'spark': `Spark is Forge's rapid validation tool:
- Generates keywords from your idea description
- Runs 3 parallel deep research calls (demand, TAM, competitors)
- Synthesizes results into a quick market assessment
- Optionally enriches with SerpAPI trend data
- Much faster than full research (~2-5 minutes)`,

  'project status': `Projects follow this lifecycle:
- **Captured**: Initial draft — idea has been saved but no analysis started
- **Interviewing**: AI interview is in progress
- **Researching**: Research pipeline is running
- **Complete**: All analysis is done, reports are available`,

  'subscription tiers': `Forge has three subscription tiers:
- **Free**: Access to Lightning mode, Basic tier reports
- **Pro**: Full interview modes, Pro tier reports, AI Agent access
- **Enterprise**: All features, highest quality analysis, priority processing`,

  'agent': `The AI Agent is your research assistant within Forge:
- Ask questions about your project data using natural language
- The agent can search across all your research, reports, and interview transcripts
- It can generate new content blocks ("Agent Insights") to add to your reports
- Available to PRO and Enterprise subscribers
- Powered by Claude with access to your project's embedded knowledge base`,

  'embeddings': `Forge embeds your project data for AI search:
- Research insights, reports, interview transcripts, notes, and trend data
- Uses OpenAI text-embedding-3-small for vector generation
- Stored in PostgreSQL with pgvector for fast similarity search
- Enables the AI Agent to find relevant information across all your data`,
};

/**
 * Look up product knowledge by topic.
 * Uses fuzzy matching — returns the best match or a generic response.
 */
export function getProductKnowledge(topic: string): string {
  const normalizedTopic = topic.toLowerCase().trim();

  // Direct match
  if (KNOWLEDGE_BASE[normalizedTopic]) {
    return KNOWLEDGE_BASE[normalizedTopic];
  }

  // Fuzzy match — find the key with the most word overlap
  let bestMatch = '';
  let bestScore = 0;

  const topicWords = normalizedTopic.split(/\s+/);

  for (const key of Object.keys(KNOWLEDGE_BASE)) {
    const keyWords = key.split(/\s+/);
    let score = 0;

    for (const word of topicWords) {
      if (keyWords.some((kw) => kw.includes(word) || word.includes(kw))) {
        score++;
      }
    }

    // Also check if the topic appears in the knowledge content
    if (KNOWLEDGE_BASE[key].toLowerCase().includes(normalizedTopic)) {
      score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = key;
    }
  }

  if (bestScore > 0 && bestMatch) {
    return KNOWLEDGE_BASE[bestMatch];
  }

  return `I don't have specific documentation about "${topic}". You can ask me about: interview modes, report types, report tiers, research pipeline, Spark, project status, subscription tiers, the AI agent, or embeddings.`;
}
