// src/services/aiService.js

const OPENROUTER_API_KEY =
  import.meta.env.VITE_OPENROUTER_API_KEY ||
  "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";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function sanitizeText(str) {
  if (!str) return "";
  return String(str)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .trim();
}

/**
 * Lightweight Client-Side Retrieval Step:
 * Finds the most relevant snippets from extracted document text matching the user query
 */
export function retrieveRelevantChunks(documentText, userQuery, maxChunks = 4) {
  if (!documentText || !userQuery) return documentText.slice(0, 10000);

  const paragraphs = documentText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40);

  if (paragraphs.length <= maxChunks) return documentText.slice(0, 10000);

  const queryTerms = userQuery
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const scored = paragraphs.map((para) => {
    const lowerPara = para.toLowerCase();
    let score = 0;
    queryTerms.forEach((term) => {
      if (lowerPara.includes(term)) score += 1;
    });
    return { para, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, maxChunks).map((item) => item.para);

  return selected.join("\n\n---\n\n");
}

export async function askGrok(messages, systemPrompt = "") {
  if (!OPENROUTER_API_KEY) {
    throw new Error("Missing OpenRouter API Key in .env (VITE_OPENROUTER_API_KEY).");
  }

  const formattedMessages = [];

  if (systemPrompt && typeof systemPrompt === "string" && systemPrompt.trim()) {
    formattedMessages.push({
      role: "system",
      content: sanitizeText(systemPrompt),
    });
  }

  if (Array.isArray(messages)) {
    messages.forEach((m) => {
      if (m && m.content && String(m.content).trim()) {
        formattedMessages.push({
          role: m.role === "assistant" ? "assistant" : "user",
          content: sanitizeText(m.content),
        });
      }
    });
  } else if (messages && String(messages).trim()) {
    formattedMessages.push({
      role: "user",
      content: sanitizeText(messages),
    });
  }

  const candidateModels = [
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.3-70b-instruct",
    "deepseek/deepseek-chat",
    "google/gemini-flash-1.5",
  ];

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY.trim()}`,
          "HTTP-Referer": window.location.origin || "http://localhost:5173",
          "X-Title": "StudiFi AI Document Assistant",
        },
        body: JSON.stringify({
          model: model,
          messages: formattedMessages,
          temperature: 0.2,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        console.warn(`Model ${model} failed:`, errJson);
        lastError = errJson?.error?.message || `HTTP ${response.status}`;
        continue;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;

      if (content) return content;
    } catch (err) {
      console.warn(`Fetch error with ${model}:`, err);
      lastError = err.message;
    }
  }

  throw new Error(`AI generation failed: ${lastError || "All models failed"}`);
}