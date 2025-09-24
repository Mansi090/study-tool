import OpenAI from 'openai';

// Prefer OpenRouter if key is present; else fall back to OpenAI.
let client = null;
let provider = null; // 'openrouter' | 'openai'

if (process.env.OPENROUTER_API_KEY) {
  client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      ...(process.env.OPENROUTER_SITE_URL ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL } : {}),
      ...(process.env.OPENROUTER_SITE_NAME ? { 'X-Title': process.env.OPENROUTER_SITE_NAME } : {}),
    },
  });
  provider = 'openrouter';
} else if (process.env.OPENAI_API_KEY) {
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  provider = 'openai';
}

function getDefaultModel() {
  if (provider === 'openrouter') {
    return process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1:free';
  }
  // openai default
  return process.env.OPENAI_MODEL || 'gpt-4o-mini';
}

function ensureClient() {
  if (!client) {
    const err = new Error('No AI provider configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY.');
    err.code = 'NO_AI_PROVIDER';
    throw err;
  }
}

function chunkText(text, maxLen = 6000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += maxLen) {
    chunks.push(text.slice(i, i + maxLen));
  }
  return chunks;
}

export async function aiSummarize(text, { sentences = 6 } = {}) {
  ensureClient();
  const chunks = chunkText(text);
  // If long, summarize chunks then summarize the summaries
  const partials = [];
  for (const chunk of chunks) {
    const prompt = `You are a helpful study assistant. Summarize the following content in ${sentences} concise sentences highlighting key concepts and relationships. Keep it clear and student-friendly.\n\nCONTENT:\n\n${chunk}`;
    const res = await client.chat.completions.create({
      model: getDefaultModel(),
      messages: [
        { role: 'system', content: 'You are an expert study assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    });
    partials.push(res.choices[0]?.message?.content?.trim() || '');
  }
  if (partials.length === 1) return partials[0];
  const combined = partials.join('\n');
  const finalPrompt = `Combine and refine the following partial summaries into a single cohesive summary of about ${sentences} sentences. Emphasize core ideas and logical flow.\n\n${combined}`;
  const final = await client.chat.completions.create({
    model: getDefaultModel(),
    messages: [
      { role: 'system', content: 'You are an expert study assistant.' },
      { role: 'user', content: finalPrompt }
    ],
    temperature: 0.3,
  });
  return final.choices[0]?.message?.content?.trim() || combined;
}

export async function aiFlashcards(text, { count = 8 } = {}) {
  ensureClient();
  const prompt = `Create ${count} effective flashcards from the content below. Return strict JSON with shape {"cards": [{"question": string, "answer": string} ...]}. Keep questions short and specific; answers concise (1-3 sentences). Avoid markdown, no code fences.\n\nCONTENT:\n${text}`;
  const res = await client.chat.completions.create({
    model: getDefaultModel(),
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are an expert at generating study materials.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.4,
  });
  const raw = res.choices[0]?.message?.content || '{}';
  let parsed;
  try { parsed = JSON.parse(raw); } catch { parsed = { cards: [] }; }
  if (!Array.isArray(parsed.cards)) parsed.cards = [];
  return parsed;
}

export async function aiQuiz(text, { count = 5 } = {}) {
  ensureClient();
  const prompt = `Create ${count} multiple-choice questions (MCQs) from the content below. Return strict JSON with shape {"quiz": [{"question": string, "options": string[], "answer": string} ...]}. Ensure options include exactly one correct answer and 3 plausible distractors. Avoid markdown, no code fences.\n\nCONTENT:\n${text}`;
  const res = await client.chat.completions.create({
    model: getDefaultModel(),
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are an expert at generating fair, clear MCQs.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.5,
  });
  const raw = res.choices[0]?.message?.content || '{}';
  let parsed;
  try { parsed = JSON.parse(raw); } catch { parsed = { quiz: [] }; }
  if (!Array.isArray(parsed.quiz)) parsed.quiz = [];
  return parsed;
}
