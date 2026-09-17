# Chat RAG Lite

A lightweight **document RAG chatbot** built with vanilla HTML/CSS/JavaScript and Python Flask.

Upload a document, generate an AI summary, and ask questions that are answered using content retrieved from the uploaded document.

## ✨ Features

- 📄 Upload **PDF, DOCX, PPTX, TXT, and Markdown** files
- 🧠 Automatic text extraction and chunking
- 📝 AI-generated document summaries
- 💬 Ask questions about uploaded documents
- 🔎 Lightweight RAG retrieval with source-chunk references
- 📚 Support for multiple documents
- 🗂️ Chat history stored in SQLite
- 🗑️ Delete documents and clear conversations
- 🌙 Modern responsive dark interface
- 🔐 Groq API key stays on the backend
- ⚡ No React, LangChain, FAISS, or large local AI models

## 🛠️ Tech Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript

### Backend

- Python 3.11+
- Flask
- Gunicorn

### Document Processing

- PyMuPDF — PDF text extraction
- python-docx — DOCX text extraction
- python-pptx — PPTX text extraction

### AI

- Groq API
- OpenAI-compatible chat completions API

### Database

- SQLite

## 🧩 How It Works

```text
                  Upload document
                         │
                         ▼
                Extract document text
                         │
                         ▼
                    Split into chunks
                         │
                         ▼
                 Store chunks in SQLite
                         │
                         ▼
                  User asks a question
                         │
                         ▼
                Retrieve relevant chunks
                         │
                         ▼
                Send context to Groq LLM
                         │
                         ▼
                  Grounded AI response
```

The project intentionally uses a small lexical retrieval system instead of a heavy vector database or local embedding model. This keeps installation, hosting, and maintenance simple.

## 📁 Project Structure

```text
chat-rag-lite/
│
├── backend/
│   ├── __init__.py
│   ├── app.py
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   └── assets/
│       ├── app.js
│       └── style.css
│
├── sql/
│   └── schema.sql
│
├── .env.example
├── .gitignore
├── Procfile
└── README.md
```

## 🚀 Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/chat-rag-lite.git
cd chat-rag-lite
```

### 2. Create a virtual environment

#### Windows PowerShell

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

#### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
```

### 4. Configure Groq

Create a Groq API key and set it as an environment variable.

#### Windows PowerShell

```powershell
$env:GROQ_API_KEY="YOUR_GROQ_API_KEY"
```

#### macOS / Linux

```bash
export GROQ_API_KEY="YOUR_GROQ_API_KEY"
```

The API key must remain on the server and should never be placed in frontend JavaScript.

### 5. Start the application

```bash
python -m backend.app
```

Open:

```text
http://127.0.0.1:5000
```

## 🔑 Environment Variables

Copy `.env.example` as a starting point when using an environment-variable based setup.

```text
GROQ_API_KEY=your_key_here
GROQ_MODEL=openai/gpt-oss-20b
DATABASE_URL=
MAX_FILE_MB=15
MAX_CHUNKS_TO_SEND=8
```

`DATABASE_URL` is optional. When it is not set, the application uses local SQLite.

## 🗄️ Database

The application uses SQLite by default and creates the database automatically.

Main tables:

- `documents` — uploaded document metadata
- `chunks` — extracted document chunks used for retrieval
- `chats` — conversations
- `messages` — chat messages

The database file is local and should not be committed to GitHub.

## 🔎 RAG Retrieval

The current retrieval pipeline is deliberately lightweight:

1. Extract text from the document.
2. Split the text into overlapping chunks.
3. Store chunks in SQLite.
4. Score chunks against the user's question using token/phrase matching.
5. Select the most relevant chunks.
6. Send those chunks and recent conversation context to the Groq model.
7. Ask the model to answer using the supplied document context.

This approach avoids downloading a local embedding model and keeps the application suitable for small free hosting environments.

## 📝 Document Summarization

When a document is uploaded, the backend can generate an AI summary from extracted document content.

The summary is designed around sections such as:

- Overview
- Key points
- Important details
- One-line takeaway

## ⚙️ Configuration

Default limits can be adjusted through environment variables.

```text
MAX_FILE_MB=15
MAX_CHUNKS_TO_SEND=8
```

Increase these carefully on low-resource hosting because larger documents and larger context windows require more memory and API usage.

## ⚠️ Current Limitations

- Scanned/image-only PDFs are not OCR'd.
- Retrieval is lexical rather than embedding-based, so highly paraphrased questions may sometimes retrieve weaker context.
- The current project is designed for lightweight usage rather than very large document collections.
- Authentication is not included in the current version.
- SQLite is best suited to small deployments and single-instance use.

## 🔮 Possible Future Improvements

- Semantic embeddings for better retrieval
- Hybrid lexical + vector search
- OCR for scanned PDFs
- User authentication and private document collections
- Streaming AI responses
- Better document citation and page/slide references
- Saved flashcards and quizzes from documents
- Document folders and search
- More advanced conversation management

## 🔐 Security Notes

Never commit secrets to GitHub.

Do **not** put your real Groq API key inside:

```text
frontend/assets/app.js
frontend/index.html
```

Use environment variables on the backend instead.

Also make sure `.env` and generated database files remain ignored by Git.

## 📌 Why This Project Is Lightweight

This project intentionally avoids a large framework and heavy AI pipeline.

Instead of:

```text
React
Next.js
LangChain
Vector database
Local embedding model
Docker
```

it uses:

```text
Vanilla HTML/CSS/JavaScript
          +
       Flask
          +
   Lightweight RAG
          +
       SQLite
          +
        Groq
```

That makes it easier to understand, run locally, modify, and deploy on limited resources.

## 📜 License

Add the license you want to use for your project.

---

Built as a lightweight academic/document assistant inspired by the SAGE-style offline-friendly architecture.
