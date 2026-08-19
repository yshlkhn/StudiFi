const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function askGrok(messages, systemPrompt = 'You are StudiFi AI Assistant.') {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey || apiKey.includes('your_')) {
    throw new Error('VITE_OPENROUTER_API_KEY is missing in .env file.');
  }

  const formattedMessages = [
    { role: 'system', content: String(systemPrompt || '') },
    ...messages.map((m) => ({
      role: m.role || 'user',
      content: String(m.content || ''),
    })),
  ];

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'StudiFi',
    },
    body: JSON.stringify({
      // Auto-routes across all available 100% free models
      model: 'openrouter/free',
      messages: formattedMessages,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `API Error: HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response generated.';
}

export async function generateQuizFromText(textContent, topic = 'General', count = 5) {
  const systemPrompt =
    'You are a strict JSON quiz generator. Output ONLY a valid JSON array of questions without backticks, markdown, or commentary.';

  const prompt = `Generate exactly ${count} multiple choice questions.
Topic: ${topic}
Study Material:
${textContent ? textContent.slice(0, 5000) : 'Standard Computer Science & Academic concepts'}

Return in this exact schema:
[
  {
    "id": 1,
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation"
  }
]`;

  const raw = await askGrok([{ role: 'user', content: prompt }], systemPrompt);

  if (!raw) throw new Error('Empty response from AI engine.');

  // Extract JSON cleanly
  const jsonMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
  const targetStr = jsonMatch ? jsonMatch[0] : raw.replace(/```json/gi, '').replace(/```/g, '').trim();

  return JSON.parse(targetStr);
}