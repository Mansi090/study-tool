import express from 'express';
import multer from 'multer';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { aiSummarize, aiFlashcards, aiQuiz } from '../services/ai.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// -------- Utilities --------
function textSummary(text, maxSentences = 5) {
  if (!text) return '';
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 20);
  if (sentences.length <= maxSentences) return sentences.join(' ');
  return sentences.slice(0, maxSentences).join(' ');
}

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

  if (mimetype?.startsWith('text/') || ['txt', 'md'].includes(ext)) {
    return buffer.toString('utf-8');
  }

  throw new Error(`Unsupported file type: ${mimetype || ext}`);
}

// -------- Routes --------
router.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

router.post('/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    try {
      const text = await extractTextFromFile(req.file);
      res.json({ textLength: text.length, text: text.slice(0, 20000) });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
});

router.post('/summarize', express.json({ limit: '5mb' }), async (req, res) => {
  const { text, sentences = 5 } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing "text".' });

  try {
    if (process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY) {
      const summary = await aiSummarize(text, { sentences });
      return res.json({ summary });
    }
    const summary = textSummary(text, sentences);
    res.json({ summary, note: 'Fallback heuristic used (no AI key).' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/flashcards', express.json({ limit: '5mb' }), async (req, res) => {
  const { text, count = 8 } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing "text".' });

  try {
    if (process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY) {
      const { cards } = await aiFlashcards(text, { count });
      return res.json({ cards });
    }
    res.status(500).json({ error: 'No AI key configured for flashcards.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/quiz', express.json({ limit: '5mb' }), async (req, res) => {
  const { text, count = 5, difficulty = 'medium' } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing "text".' });

  try {
    if (process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY) {
      const { quiz } = await aiQuiz(text, { count, difficulty });
      return res.json({ quiz });
    }
    res.status(500).json({ error: 'No AI key configured for quiz.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
