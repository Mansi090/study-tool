import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { aiSummarize, aiFlashcards, aiQuiz } from './services/ai.js';

// Load env vars immediately
dotenv.config();
console.log('OPENROUTER_API_KEY loaded:', !!process.env.OPENROUTER_API_KEY);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ----------------- File extraction -----------------
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

  if (mimetype?.startsWith('text/') || ['txt', 'md'].includes(ext)) return buffer.toString('utf-8');

  throw new Error(`Unsupported file type: ${mimetype || ext}`);
}

// ----------------- Routes -----------------
app.get('/', (_req, res) => res.send('Studyy Buddy API is live!'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const text = await extractTextFromFile(req.file);
    res.json({ textLength: text.length, text: text.slice(0, 20000) });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Failed to parse file' });
  }
});

app.post('/api/summarize', async (req, res) => {
  const { text, sentences = 5, trackSources = false } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing "text"' });

  try {
    const summary = (process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY)
      ? await aiSummarize(text, { sentences, trackSources })
      : text.slice(0, 500); // fallback
    res.json({ summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/flashcards', async (req, res) => {
  const { text, count = 8 } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing "text"' });

  try {
    const result = (process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY)
      ? await aiFlashcards(text, { count })
      : { cards: [] };
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/quiz', async (req, res) => {
  const { text, count = 5, difficulty = 'medium' } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing "text"' });

  try {
    const result = (process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY)
      ? await aiQuiz(text, { count, difficulty })
      : { quiz: [] };
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 404 fallback
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
