import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config(); // Ensure .env is loaded first

// -------- Provider Setup --------
let client = null;
let provider = null;

console.log('Initializing AI client...');
console.log('OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);

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
  console.log('Using OpenRouter as AI provider.');
} else if (process.env.OPENAI_API_KEY) {
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  provider = 'openai';
  console.log('Using OpenAI as AI provider.');
} else {
  console.log('No AI provider found! Fallback heuristics will be used.');
}

// -------- Helpers --------
function ensureClient() {
  if (!client) {
    const err = new Error('No AI provider configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY.');
    err.code = 'NO_AI_PROVIDER';
    throw err;
  }
}

function getDefaultModel() {
  if (provider === 'openrouter') return process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1:free';
  return process.env.OPENAI_MODEL || 'gpt-4o-mini';
}

function chunkText(text, maxLen = 6000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += maxLen) {
    chunks.push(text.slice(i, i + maxLen));
  }
  return chunks;
}

// -------- AI Functions --------
export async function aiSummarize(text, { sentences = 6, trackSources = false } = {}) {
  if (!client) throw new Error('No AI provider configured.');
  const chunks = chunkText(text);
  const partials = [];

  for (const chunk of chunks) {
    const prompt = `Summarize in ${sentences} clear sentences.${trackSources ? ' Include source references if possible.' : ''}\n\nCONTENT:\n${chunk}`;
    const res = await client.chat.completions.create({
      model: getDefaultModel(),
      messages: [
        { role: 'system', content: 'You are an expert academic summarizer producing concise summaries.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    });
    partials.push(res.choices[0]?.message?.content?.trim() || '');
  }

  if (partials.length === 1) return partials[0];

  const finalPrompt = `Combine these partial summaries into one cohesive summary of ${sentences} sentences.\n${trackSources ? 'Include sources if present.' : ''}\n\n${partials.join('\n')}`;
  const final = await client.chat.completions.create({
    model: getDefaultModel(),
    messages: [
      { role: 'system', content: 'You are an expert summarizer producing cohesive final summaries.' },
      { role: 'user', content: finalPrompt },
    ],
    temperature: 0.2,
  });

  return final.choices[0]?.message?.content?.trim() || partials.join('\n');
}

export async function aiFlashcards(text, { count = 8, trackSources = false } = {}) {
  if (!client) throw new Error('No AI provider configured.');

  const prompt = `Create ${count} flashcards from the content.
Each flashcard should have a concise question and answer.
${trackSources ? ' Include a "source" field.' : ''}
Return JSON in shape: {"cards":[{"question":string,"answer":string${trackSources ? ',"source":string' : ''}}...]}

CONTENT:\n${text}`;

  const res = await client.chat.completions.create({
    model: getDefaultModel(),
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are an expert educator creating effective flashcards.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
  });

  try {
    const parsed = JSON.parse(res.choices[0]?.message?.content || '{}');
    if (!Array.isArray(parsed.cards)) parsed.cards = [];
    return parsed;
  } catch {
    return { cards: [] };
  }
}

export async function aiQuiz(text, { count = 5, difficulty = 'medium', trackSources = false } = {}) {
  if (!client) throw new Error('No AI provider configured.');

  const difficultyMap = {
    easy: 'basic recall',
    medium: 'application & analysis',
    hard: 'evaluation & synthesis',
  };
  const desc = difficultyMap[difficulty] || difficultyMap.medium;

  const prompt = `Create ${count} multiple-choice questions at ${difficulty} level.
- Test ${desc}
- Each has 1 correct answer + 3 distractors
${trackSources ? '- Include a "source" field if possible.' : ''}
Return JSON in shape: {"quiz":[{"question":string,"options":string[],"answer":string,"difficulty":"${difficulty}"${trackSources ? ',"source":string' : ''}}...]}

CONTENT:\n${text}`;

  const res = await client.chat.completions.create({
    model: getDefaultModel(),
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are an expert assessment designer creating fair MCQs.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.4,
  });

  try {
    const parsed = JSON.parse(res.choices[0]?.message?.content || '{}');
    if (!Array.isArray(parsed.quiz)) parsed.quiz = [];
    return parsed;
  } catch {
    return { quiz: [] };
  }
}
