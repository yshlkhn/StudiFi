const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function askGrok(messages, systemPrompt = "You are StudiFi AI Assistant.") {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_XAI_API_KEY;

  if (!apiKey || apiKey.includes("your_")) {
    throw new Error("VITE_OPENROUTER_API_KEY is missing in .env file.");
  }

  const formattedMessages = [
    { role: "system", content: String(systemPrompt || "") },
    ...messages.map((m) => ({
      role: m.role || "user",
      content: String(m.content || ""),
    })),
  ];

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey.trim()}`,
      "HTTP-Referer": "http://localhost:5173",
      "X-Title": "StudiFi",
    },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: formattedMessages,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `AI API Error: HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function safeParseJSON(rawStr) {
  if (!rawStr) return null;

  const match = rawStr.match(/\[\s*\{[\s\S]*\}\s*\]/);
  let clean = match ? match[0] : rawStr.replace(/```json/gi, "").replace(/```/g, "").trim();

  // Strip illegal ASCII control characters
  clean = clean.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "");

  try {
    return JSON.parse(clean);
  } catch {
    const fixedNewlines = clean.replace(/(?<!\\)\n/g, "\\n").replace(/\r/g, "");
    return JSON.parse(fixedNewlines);
  }
}

export async function generateQuizFromText(textContent, subjectName, count = 5) {
  const systemPrompt = `You are a university examination professor for "${subjectName}".
STRICT RULES:
1. Generate deep, conceptual multiple choice questions based on the technical content, definitions, laws, and principles in the text.
2. NEVER ask meta questions (e.g., "What is the subject?", "What type of questions should be prepared?").
3. Output STRICTLY a valid JSON array of objects. No markdown ticks, no preamble.

Schema:
[{"id": 1, "question": "Technical question text?", "options": ["Option A", "Option B", "Option C", "Option D"], "correctAnswer": 0, "explanation": "Brief reasoning"}]`;

  const prompt = `Subject: ${subjectName}
Study Notes Content:
"""
${textContent.slice(0, 8000)}
"""

Generate ${count} academic MCQs strictly from the material above:`;

  const raw = await askGrok([{ role: "user", content: prompt }], systemPrompt);
  if (!raw) throw new Error("Empty response received from AI engine.");

  return safeParseJSON(raw);
}