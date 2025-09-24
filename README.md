# Study Tool

Generate study materials (summaries, flashcards, quizzes) from your PDFs/DOCX/TXT using a modern React frontend and a lightweight Express backend.

- Frontend: Vite + React + TypeScript + Tailwind + shadcn-ui
- Backend: Node.js + Express
- File parsing: `pdfjs-dist` (PDF), `mammoth` (DOCX)
- AI: OpenAI or OpenRouter (optional). Falls back to local heuristics if no key.

## Monorepo Structure

- `backend/` — Express server (APIs, file parsing, AI helpers)
- `src/` — React app source
- `public/` — static assets
- `vite.config.ts` — dev server + proxy for `/api`

## Quick Start (Local Development)

Prerequisite: Node.js 18+ (20+ recommended), npm 9+

1. Install root dependencies and start the frontend:
   ```bash
   npm install
   npm run dev
   ```
   This starts Vite on `http://localhost:8080`.

2. In another terminal, start the backend:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   The backend runs on `http://localhost:3001`.

3. In development, the frontend proxies `/api` to the backend (see `vite.config.ts`). No extra config needed. Open `http://localhost:8080` and try uploading a file.

## Environment Variables

- Frontend (create `.env` in repo root):
  - `VITE_API_BASE` — Optional. Set to your deployed backend URL in production (e.g., `https://your-backend.example`). In development you can leave it empty (proxy handles `/api`).

- Backend (create `.env` in `backend/`; see `backend/.env.example`):
  - `PORT` — Default `3001`. Hosting platforms usually inject this.
  - Using OpenAI:
    - `OPENAI_API_KEY` — Enables AI generation.
    - `OPENAI_MODEL` — Default `gpt-4o-mini`.
  - Using OpenRouter (alternative to OpenAI):
    - `OPENROUTER_API_KEY`
    - `OPENROUTER_MODEL` — e.g. `deepseek/deepseek-chat-v3.1:free`

If no AI key is configured, the backend uses fast heuristic generation for summaries/flashcards/quizzes.

## Scripts

- Frontend (root):
  - `npm run dev` — Start Vite dev server
  - `npm run build` — Build static assets to `dist/`
  - `npm run preview` — Preview the production build locally

- Backend (`backend/`):
  - `npm run dev` — Start with nodemon (auto-reload)
  - `npm start` — Start with Node (production)

## API Overview (Backend)

- `GET /api/health` — Health check
- `POST /api/upload` — multipart/form-data (field: `file`). Returns `{ text, textLength }`.
- `POST /api/summarize` — `{ text: string, sentences?: number }`
- `POST /api/flashcards` — `{ text: string, count?: number }`
- `POST /api/quiz` — `{ text: string, count?: number }`

See details in `backend/README.md`.

## Deployment

Recommended simple setup:

- Backend on Render (or Railway)
- Frontend on Vercel (or Netlify)

### Deploy Backend (Render)

1. Push this repo to GitHub.
2. On Render, create a new Web Service from the repo.
3. Settings:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Node Version: 20+
   - Environment: set `OPENAI_API_KEY` or `OPENROUTER_API_KEY` (optional). `PORT` is auto.
4. Deploy and copy the backend URL (e.g., `https://studyy-tool-backend.onrender.com`).

### Deploy Frontend (Vercel)

1. Import the GitHub repo to Vercel.
2. Settings:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment variables:
     - `VITE_API_BASE` = your backend URL
3. Deploy and open your site.

For Netlify, similar settings apply (build `npm run build`, publish `dist`, add `VITE_API_BASE`).

### CORS

The backend uses `cors({ origin: true })` for convenience. For production, restrict to your frontend origin in `backend/src/index.js`:

```js
import cors from 'cors';
app.use(cors({ origin: ['https://your-frontend.example'] }));
```

## Troubleshooting

- PDF parsing errors or missing `pdfjs-dist`:
  - Ensure you ran `npm install` inside `backend/`.

- Frontend cannot reach backend after deployment:
  - Set `VITE_API_BASE` in the frontend environment to the deployed backend URL.
  - Confirm CORS is configured to allow your frontend origin.

- Large file uploads (413 errors):
  - Upload limit is 20MB (see `multer` config in `backend/src/routes/api.js`). Reduce size or adjust the limit.

## License

MIT (or your chosen license)
