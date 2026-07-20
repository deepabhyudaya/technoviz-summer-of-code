import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;
const isEnabled = process.env.NEXT_PUBLIC_GEMINI_ENABLED === "true";

let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

export function isGeminiEnabled() {
  return isEnabled && !!API_KEY;
}

export function getGeminiModel() {
  if (!API_KEY) return null;
  if (!genAI) genAI = new GoogleGenerativeAI(API_KEY);
  if (!model) model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
  return model;
}

export interface GeminiCallOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function callGemini(
  prompt: string,
  options: GeminiCallOptions = {}
): Promise<{ text: string; error?: string }> {
  if (!isGeminiEnabled()) {
    return { text: "", error: "AI assistant is not configured." };
  }

  const m = getGeminiModel();
  if (!m) {
    return { text: "", error: "AI model could not be initialized." };
  }

  try {
    const generationConfig = {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 1024,
    };

    let result;
    if (options.system) {
      result = await m.generateContent({
        contents: [
          { role: "user", parts: [{ text: options.system }] },
          { role: "model", parts: [{ text: "Understood." }] },
          { role: "user", parts: [{ text: prompt }] },
        ],
        generationConfig,
      });
    } else {
      result = await m.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      });
    }

    const text = result.response.text();
    return { text: text?.trim() ?? "" };
  } catch (err: any) {
    console.error("Gemini API error:", err);
    return {
      text: "",
      error: err?.message || "The AI service is temporarily unavailable.",
    };
  }
}
