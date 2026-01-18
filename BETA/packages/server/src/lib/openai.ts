import OpenAI from 'openai';

// Log OpenAI initialization status
const apiKey = process.env.OPENAI_API_KEY;
console.log('[OpenAI] API Key configured:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');

// Initialize OpenAI client with API key from environment
export const openai = new OpenAI({
  apiKey,
});

// Default model for interview conversations
export const INTERVIEW_MODEL = 'gpt-5.2';

// Model for data extraction (structured output)
export const EXTRACTION_MODEL = 'gpt-5.2';
