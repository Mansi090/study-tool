# Studyy Tool Backend (Express)

A minimal backend for the Studyy Tool app, built with Node.js + Express. It provides endpoints for health check, file upload and parsing (PDF/DOCX/TXT/MD), and AI-powered or heuristic generation for summaries, flashcards, and quizzes.

## Features

- PDF text extraction via `pdfjs-dist`
- DOCX text extraction via `mammoth`
- TXT/MD ingestion
- AI generation when an API key is configured, otherwise a fast heuristic fallback
- Robust error handling and file-size limits

## Endpoints

- `GET /api/health` — Service status
- `POST /api/upload` — multipart/form-data (field: `file`), extracts text and returns `{ text, textLength }`
- `POST /api/summarize` — JSON `{ text: string, sentences?: number }`
- `POST /api/flashcards` — JSON `{ text: string, count?: number }`
- `POST /api/quiz` — JSON `{ text: string, count?: number }`

## Project Structure

- `src/index.js` — Express app bootstrap
- `src/routes/api.js` — API routes and file parsing logic
- `src/services/ai.js` — AI helpers (OpenAI/OpenRouter support) and heuristic fallbacks

## Requirements

- Node.js 18+ (Node 20+ recommended)
- npm 9+

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment file and fill in values:
   ```bash
   cp .env.example .env
   ```
3. Start dev server (auto-reloads via nodemon):
   ```bash
   npm run dev
   ```
   The server runs on `http://localhost:3001` by default.

## Environment Variables

Create `.env` in `backend/` (see `.env.example`). Supported variables:

- `PORT` — Port to listen on (default: `3001`). Hosting platforms usually inject this.
- If using OpenAI:
  - `OPENAI_API_KEY` — OpenAI API key (enables real AI generation).
  - `OPENAI_MODEL` — Model to use (default: `gpt-4o-mini`).
- If using OpenRouter instead of OpenAI:
  - `OPENROUTER_API_KEY` — OpenRouter API key.
  - `OPENROUTER_MODEL` — e.g. `deepseek/deepseek-chat-v3.1:free`.

Without any key set, the service falls back to a local heuristic for summaries/flashcards/quizzes.

## File Parsing Notes

- PDF parsing uses `pdfjs-dist`: pages are iterated and text items concatenated.
- DOCX parsing uses `mammoth.extractRawText`.
- Plain text/markdown is read as UTF-8.

## Running Scripts

- `npm run dev` — Start with nodemon (development)
- `npm start` — Start with Node (production)

## Deployment

You can deploy the backend to any Node-capable host. Two simple options:

### Render

- Create a new Web Service from this repo.
- Settings:
  - Root Directory: `backend`
  - Build Command: `npm install`
  - Start Command: `npm start`
  - Node Version: 20+
  - Environment: add `OPENAI_API_KEY` or `OPENROUTER_API_KEY` if desired. `PORT` is auto-set by Render.
- Deploy and note the service URL, e.g. `https://studyy-tool-backend.onrender.com`.

### Railway

- Create a new service from GitHub.
- Set Root to `backend/` and use the same build/start commands.
- Add environment variables as needed.
- Deploy and copy the public URL.

## CORS

The app uses `cors({ origin: true })` during development to simplify testing. For production, restrict origins to your frontend domain, e.g.:

```js
import cors from 'cors';
app.use(cors({ origin: ['https://your-frontend.example'] }));
```

## Troubleshooting

- `ERR_MODULE_NOT_FOUND` for a package:
  - Ensure you ran `npm install` inside the `backend/` directory.
  - Verify the dependency exists in `backend/package.json`.

- PDF parsing issues:
  - Large or scanned PDFs may contain limited text. Try a text-based PDF.

- 413 Payload Too Large on upload:
  - The upload limit is set to 20MB in `multer`. Reduce file size or increase the limit if needed.

## License

MIT (or your chosen license)
