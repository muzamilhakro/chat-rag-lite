# Chat RAG Lite

A lightweight document-chat website inspired by the SAGE-style stack: vanilla HTML/CSS/JavaScript + Python Flask. Upload PDF, DOCX, PPTX, TXT or Markdown files, generate a summary, and ask grounded questions about the document.

## What makes it lightweight

- No React, Next.js, Tailwind, LangChain, FAISS, or local embedding model.
- Text extraction uses PyMuPDF, python-docx, and python-pptx.
- Retrieval uses a small local lexical scorer over chunks instead of downloading a large embedding model.
- Groq handles summarization and answer generation through its OpenAI-compatible API.
- SQLite works locally; Supabase Postgres can be used in production.

## Features

- Upload PDF/DOCX/PPTX/TXT/MD
- Automatic text extraction and chunking
- Document summary
- RAG-style Q&A with source-chunk references
- Chat history stored in the database
- Multiple uploaded documents
- Delete documents
- Clear chat
- Responsive dark UI
- No API key shipped to the browser
- Local SQLite fallback

## Local setup (Windows PowerShell)

```powershell
cd "C:\path\to\chat-rag-lite"
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend\requirements.txt
$env:GROQ_API_KEY="YOUR_GROQ_API_KEY"
python -m backend.app
```

Open http://127.0.0.1:5000

For local development, SQLite is created automatically as `data.db` and is ignored by Git.

## GitHub

```powershell
git init
git add .
git commit -m "Initial Chat RAG Lite project"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/chat-rag-lite.git
git push -u origin main
```

Never commit a real `.env` or API key. Use `.env.example` only as a template.

## Free production deployment

Recommended simple architecture:

Browser -> Render Flask web service -> Supabase Postgres + Groq API

Render is used for the Flask app. Supabase provides the persistent Postgres database. The raw uploaded files are not stored permanently by this version; only extracted text chunks are stored in the database. This avoids needing a separate object-storage service.

### Supabase

1. Create a Supabase project.
2. Open Project Settings -> Database.
3. Copy a Postgres connection string.
4. Put it into Render as `DATABASE_URL`.
5. The app creates the required tables automatically on startup.

### Render

1. Create a Render account.
2. New -> Web Service.
3. Connect your GitHub repo.
4. Build command: `pip install -r backend/requirements.txt`
5. Start command: `gunicorn backend.app:app --bind 0.0.0.0:$PORT`
6. Choose the Free instance while prototyping.
7. Add environment variables:
   - `GROQ_API_KEY` = your Groq API key
   - `GROQ_MODEL` = `openai/gpt-oss-20b`
   - `DATABASE_URL` = your Supabase Postgres connection string
   - `MAX_FILE_MB` = `15`
   - `MAX_CHUNKS_TO_SEND` = `8`
8. Deploy.

Render will give the site an `onrender.com` URL.

## Important free-hosting limitations

Render free web services sleep after 15 minutes without inbound traffic and the local filesystem is ephemeral, so do not rely on `data.db` in production. Supabase is used for persistent data. Supabase's free tier is intended for hobby projects and currently includes a 500 MB database, with projects pausing after one week of inactivity.

## AI provider

The backend uses Groq's OpenAI-compatible endpoint. The default model is `openai/gpt-oss-20b`. Keep the key only in the server environment, never in frontend JavaScript.

## Current RAG behavior

1. Extract text from the uploaded document.
2. Split text into overlapping chunks.
3. Store chunks in the database.
4. Score chunks against the user's question using lightweight token overlap and phrase matching.
5. Send only the best few chunks plus recent chat messages to the LLM.
6. Ask the model to answer only from that context and cite source chunks.

## Known limitations

- Scanned/image-only PDFs are not OCR'd.
- Retrieval is lexical rather than embedding-based, so paraphrased questions may sometimes retrieve less relevant chunks.
- One server instance is the target for this free deployment.
- This version deliberately avoids user accounts; a random browser session cookie separates users. For a public multi-user production app, add Supabase Auth before collecting private documents.
