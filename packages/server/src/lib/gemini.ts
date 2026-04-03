import { GoogleGenerativeAI } from '@google/generative-ai';

// Lazy-initialized Gemini client — avoids crash at build time when GOOGLE_AI_API_KEY is not set
let _gemini: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!_gemini) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('[Gemini] GOOGLE_AI_API_KEY not set');
    }
    _gemini = new GoogleGenerativeAI(apiKey);
  }
  return _gemini;
}
