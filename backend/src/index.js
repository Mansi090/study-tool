
dotenv.config();
console.log('OPENROUTER_API_KEY loaded:', !!process.env.OPENROUTER_API_KEY);

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { aiSummarize, aiFlashcards, aiQuiz } from './services/ai.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Multer config for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// ----------------- Heuristic Utilities -----------------

function textSummary(text, maxSentences = 5) {
  if (!text) return '';
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(s => s.length > 20);
  if (sentences.length <= maxSentences) return sentences.join(' ');

  const scored = sentences.map((s, idx) => ({
    s,
    score: s.length / 200 + (1 - idx / sentences.length),
  }));

  return scored.sort((a, b) => b.score - a.score).slice(0, maxSentences).map(x => x.s).join(' ');
}

function generateFlashcards(text, count = 8) {
  const lines = text.split(/[\n.]/).map(l => l.trim()).filter(Boolean);
  const cards = [];
  for (let line of lines) {
    if (cards.length >= count) break;
    if (line.length < 30) continue;
    const [first, ...rest] = line.split(':');
    if (rest.length) cards.push({ question: `What is "${first.trim()}"?`, answer: rest.join(':').trim() });
    else if (line.includes(' is ')) {
      const [subject, def] = line.split(' is ');
      if (subject && def) cards.push({ question: `What is ${subject.trim()}?`, answer: def.trim() });
    }
  }
  while (cards.length < count && text.length > 0) {
    const idx = Math.floor(Math.random() * (text.length - 120));
    cards.push({ question: 'Explain this snippet:', answer: text.slice(idx, idx + 120) + '…' });
  }
  return cards.slice(0, count);
}

function generateQuiz(text, count = 5) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.split(' ').length > 6);
  const qs = [];
  for (let s of sentences) {
    if (qs.length >= count) break;
    const words = s.split(/\s+/);
    const idx = Math.floor(words.length / 3 + Math.random() * words.length / 3);
    const answer = words[idx].replace(/[^a-z0-9-]/gi, '');
    if (!answer) continue;
    const prompt = [...words]; prompt[idx] = '____';
    qs.push({ question: prompt.join(' '), options: ['concept','process','model',answer].sort(() => Math.random()-0.5), answer });
  }
  return qs;
}

// ----------------- File Extraction -----------------

async function extractTextFromFile(file) {
  const { originalname, mimetype, buffer } = file;
  const ext = (originalname.split('.').pop() || '').toLowerCase();

  if (mimetype === 'application/pdf' || ext === 'pdf') {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    let out = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map(it => it.str).join(' ') + '\n';
    }
    return out;
  }

  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') {
    const { value } = await mammoth.extractRawText({ buffer });
    return value || '';
  }

  if (mimetype?.startsWith('text/') || ['txt','md'].includes(ext)) return buffer.toString('utf-8');

  throw new Error(`Unsupported file type: ${mimetype || ext}`);
}

// ----------------- Routes -----------------

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Upload
app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, async err => {
    if (err) return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });

    try {
      const text = await extractTextFromFile(req.file);
      return res.json({ textLength: text.length, text: text.slice(0, 20000) });
    } catch (e) {
      console.error(e);
      return res.status(400).json({ error: e.message || 'Failed to parse file' });
    }
  });
});

// Summarize
app.post('/api/summarize', async (req, res) => {
  const { text, sentences = 5, trackSources = false } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing "text" in body' });

  try {
    if (process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY) {
      const summary = await aiSummarize(text, { sentences, trackSources });
      return res.json({ summary });
    } else {
      const summary = textSummary(text, sentences);
      return res.json({ summary, note: 'Heuristic summary used (no AI API key set)' });
    }
  } catch (e) {
    console.error('Summarize error:', e);
    return res.status(500).json({ error: 'Failed to generate summary: ' + e.message });
  }
});

// Flashcards
app.post('/api/flashcards', async (req, res) => {
  const { text, count = 8, trackSources = false } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing "text" in body' });

  try {
    if (process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY) {
      const result = await aiFlashcards(text, { count, trackSources });
      return res.json(result);
    } else {
      const cards = generateFlashcards(text, count);
      return res.json({ cards, note: 'Heuristic flashcards used (no AI API key set)' });
    }
  } catch (e) {
    console.error('Flashcards error:', e);
    return res.status(500).json({ error: 'Failed to generate flashcards' });
  }
});

// Quiz
app.post('/api/quiz', async (req, res) => {
  const { text, count = 5, difficulty = 'medium', trackSources = false } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing "text" in body' });

  try {
    if (process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY) {
      const result = await aiQuiz(text, { count, difficulty, trackSources });
      return res.json(result);
    } else {
      const quiz = generateQuiz(text, count);
      return res.json({ quiz, note: 'Heuristic quiz used (no AI API key set)' });
    }
  } catch (e) {
    console.error('Quiz error:', e);
    return res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
