# Studyy Tool Backend (Express)

A minimal backend for the Studyy Tool app, built with Node.js + Express. It provides endpoints for health check, file upload and parsing (PDF/DOCX/TXT), and basic local AI-like utilities for summarization, flashcards, and quizzes (no external AI key required).

## Endpoints

- GET `/api/health`
- POST `/api/upload` (multipart/form-data; field name: `file`) → Extracts text from PDF/DOCX/TXT/MD
- POST `/api/summarize` (JSON: `{ text: string, sentences?: number }`)
- POST `/api/flashcards` (JSON: `{ text: string, count?: number }`)
- POST `/api/quiz` (JSON: `{ text: string, count?: number }`)

## Quickstart

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start dev server (with auto-reload via nodemon):
   ```bash
   npm run dev
   ```
   The server runs on http://localhost:3001 by default.

The frontend (`vite.config.ts`) is configured to proxy `/api` to `http://localhost:3001` during development, so you can call `/api/...` directly from the React app.

## Environment Variables

Copy `.env.example` to `.env` to configure the backend and AI:

- `PORT` (default: 3001)
- `OPENAI_API_KEY` (optional but recommended) — enables real AI generation.
- `OPENAI_MODEL` (optional, default: `gpt-4o-mini`) — model to use.

## Example Requests

- Health:
  ```bash
  curl http://localhost:3001/api/health
  ```

- Upload a PDF/DOCX/TXT:
  ```bash
  curl -F "file=@/path/to/file.pdf" http://localhost:3001/api/upload
  ```

- Summarize:
  ```bash
  curl -X POST http://localhost:3001/api/summarize \
    -H "Content-Type: application/json" \
    -d '{"text":"Your text here","sentences":5}'
  ```

- Flashcards:
  ```bash
  curl -X POST http://localhost:3001/api/flashcards \
    -H "Content-Type: application/json" \
    -d '{"text":"Your text here","count":8}'
  ```

- Quiz:
  ```bash
  curl -X POST http://localhost:3001/api/quiz \
    -H "Content-Type: application/json" \
    -d '{"text":"Your text here","count":5}'
  ```

## Notes

- PDF parsing uses `pdf-parse`.
- DOCX parsing uses `mammoth`.
- If `OPENAI_API_KEY` is set, the backend sends extracted text to OpenAI with carefully designed prompts and returns structured JSON results. Without it, a local heuristic fallback is used.
