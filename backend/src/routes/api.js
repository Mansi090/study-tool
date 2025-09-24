import express from 'express';
import multer from 'multer';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { aiSummarize, aiFlashcards, aiQuiz } from '../services/ai.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB to match UI
});

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

function textSummary(text, maxSentences = 5) {
  if (!text) return '';
  const sentences = text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  if (sentences.length <= maxSentences) return sentences.join(' ');
  // naive scoring by length and presence of keywords
  const keywords = ['important', 'key', 'main', 'summary', 'therefore', 'because'];
  const scored = sentences.map((s, idx) => {
    const lenScore = Math.min(s.length / 200, 1);
    const kwScore = keywords.reduce((acc, kw) => (s.toLowerCase().includes(kw) ? acc + 0.5 : acc), 0);
    const posScore = 1 - idx / sentences.length; // earlier sentences slightly favored
    return { s, score: lenScore + kwScore + posScore };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxSentences).map(x => x.s).join(' ');
}

function generateFlashcards(text, count = 8) {
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const chunks = lines.slice(0, 200); // limit processing
  const cards = [];
  for (let i = 0; i < chunks.length && cards.length < count; i++) {
    const l = chunks[i];
    if (l.length < 20) continue;
    const q = `What is meant by: "${l.split(':')[0].slice(0, 80)}"?`;
    const a = l.length > 120 ? l.slice(0, 200) + '…' : l;
    cards.push({ question: q, answer: a });
  }
  // fallback if too few lines
  while (cards.length < count && text.length > 0) {
    const start = Math.floor((cards.length / count) * text.length);
    const snip = text.slice(start, start + 180);
    cards.push({ question: `Explain the following concept:`, answer: snip + '…' });
  }
  return cards.slice(0, count);
}

function generateQuiz(text, count = 5) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 40);
  const qs = [];
  for (let i = 0; i < sentences.length && qs.length < count; i++) {
    const s = sentences[i];
    const words = s.split(/\s+/);
    if (words.length < 6) continue;
    const idx = Math.max(3, Math.min(words.length - 2, Math.floor(words.length / 2)));
    const answer = words[idx].replace(/[^a-z0-9-]/gi, '');
    if (!answer) continue;
    const prompt = [...words];
    prompt[idx] = '____';
    const distractors = [answer, 'concept', 'process', 'theory', 'model']
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 4);
    qs.push({ question: prompt.join(' '), options: shuffle(distractors), answer });
  }
  return qs;
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

async function extractTextFromFile(file) {
  const { originalname, mimetype, buffer } = file;
  const ext = (originalname.split('.').pop() || '').toLowerCase();
  try {
    if (mimetype === 'application/pdf' || ext === 'pdf') {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
      const pdf = await loadingTask.promise;
      let out = '';
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        out += pageText + '\n';
      }
      return out;
    }
    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === 'docx'
    ) {
      const { value } = await mammoth.extractRawText({ buffer });
      return value || '';
    }
    if (mimetype?.startsWith('text/') || ext === 'txt' || ext === 'md') {
      return buffer.toString('utf-8');
    }
  } catch (e) {
    console.error('File parse error:', e);
    throw e;
  }
  throw new Error(`Unsupported file type: ${mimetype || ext}`);
}

router.post('/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        // file too large or other multer-specific issues
        const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(status).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
      const text = await extractTextFromFile(req.file);
      return res.json({ textLength: text.length, text: text.slice(0, 20000) });
    } catch (e) {
      console.error('Parse error:', e);
      return res.status(400).json({ error: e.message || 'Failed to parse file' });
    }
  });
});

router.post('/summarize', express.json({ limit: '5mb' }), async (req, res) => {
  const { text, sentences = 5 } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing "text" in body' });
  try {
    const useAI = !!process.env.OPENAI_API_KEY;
    if (useAI) {
      const summary = await aiSummarize(text, { sentences: Math.min(10, Number(sentences) || 5) });
      return res.json({ summary });
    }
    const summary = textSummary(text, Math.min(10, Number(sentences) || 5));
    return res.json({ summary, note: 'Heuristic summary used (no OPENAI_API_KEY set)' });
  } catch (e) {
    console.error('Summarize error:', e);
    return res.status(500).json({ error: 'Failed to generate summary' });
  }
});

router.post('/flashcards', express.json({ limit: '5mb' }), async (req, res) => {
  const { text, count = 8 } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing "text" in body' });
  try {
    const useAI = !!process.env.OPENAI_API_KEY;
    if (useAI) {
      const { cards } = await aiFlashcards(text, { count: Math.min(20, Number(count) || 8) });
      return res.json({ cards });
    }
    const cards = generateFlashcards(text, Math.min(20, Number(count) || 8));
    return res.json({ cards, note: 'Heuristic flashcards used (no OPENAI_API_KEY set)' });
  } catch (e) {
    console.error('Flashcards error:', e);
    return res.status(500).json({ error: 'Failed to generate flashcards' });
  }
});

router.post('/quiz', express.json({ limit: '5mb' }), async (req, res) => {
  const { text, count = 5 } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing "text" in body' });
  try {
    const useAI = !!process.env.OPENAI_API_KEY;
    if (useAI) {
      const { quiz } = await aiQuiz(text, { count: Math.min(10, Number(count) || 5) });
      return res.json({ quiz });
    }
    const quiz = generateQuiz(text, Math.min(10, Number(count) || 5));
    return res.json({ quiz, note: 'Heuristic quiz used (no OPENAI_API_KEY set)' });
  } catch (e) {
    console.error('Quiz error:', e);
    return res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

export default router;
