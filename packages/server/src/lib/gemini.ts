import { GoogleGenAI } from '@google/genai';

// Lazy-initialized Gemini client — avoids crash at build time when GOOGLE_AI_API_KEY is not set
let _gemini: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!_gemini) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('[Gemini] GOOGLE_AI_API_KEY not set');
    }
    _gemini = new GoogleGenAI({ apiKey });
  }
  return _gemini;
}
