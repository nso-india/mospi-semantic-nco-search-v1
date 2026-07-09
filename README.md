Languages: JavaScript (ES6+), Java, Python, C++, SQL, HTML5, CSS3
Frontend: React.js, Bootstrap, Responsive Web Design
Backend: Node.js, Express.js, Spring Boot, REST APIs, Socket.io
Databases: MongoDB, MySQL, Database Design, Query Optimization
DevOps & Tools: Docker, Git, GitHub, VS Code, Eclipse, Postman
Concepts: MERN Stack, Microservices, OOP, Data Structures, Agile# MoSPI NCO-Code Finder

An advanced, AI-powered semantic search and classification engine designed to seamlessly map messy, real-world, and multilingual job titles to standard **NCO 2015 (National Classification of Occupations)** codes entirely on your own hardware without relying on closed-source APIs.

---

## Table of Contents

- [Features](#-features)
- [Online vs Offline Strategy](#-online-vs-offline-strategy)
- [Tech Stack](#️-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Local LLM Setup (Ollama)](#2-local-llm-setup-ollama)
  - [3. Docker Deployment](#3-docker-deployment-recommended)
  - [4. Local Installation](#4-local-installation)
- [Environment Variables](#-environment-variables)
- [API Endpoints](#-api-endpoints)
- [Architecture](#️-architecture)
- [Contributing](#-contributing)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)

---

## Features

### AI-Powered Classification
- **Local LLM Reranking** — Gemma model integration via Ollama. Ensures deep contextual understanding of slang and typos without sending any data to OpenAI/Groq.
- **Semantic Normalization** — Intelligently resolves messy, unstructured queries into standard job titles.
- **Fallback Suggestions** — When confidence is low, the AI autonomously explores adjacent occupation families to propose highly relevant alternatives.

### Multilingual Support
- **Language-Agnostic Search** — Query in English, Hindi, Bengali, Tamil, and more natively.
- **Auto-Translation** — Responses and database matches are instantly translated back into the user's queried language.
- **UI Localization** — Global Google Translate module embedded in the Navbar translates the entire web application instantly.

### Performance & Scale
- **Batch Processing** — Blazing fast concurrent CSV classification utilizing ThreadPoolExecutor.
- **Vector Search** — Powered by Qdrant and FastEmbed (local sentence-transformers) for millisecond latency on millions of records.
- **Audio Input** — Voice-to-text API endpoints allow users to search using their voice natively.

### Analytics & Feedback
- **Real-Time Dashboard** — Interactive Recharts-based metrics tracking API latency, language popularity, and usage patterns.
- **User Feedback System** — Beautiful card-style interface for capturing text and image-based issue reports, saving them directly to the filesystem.

---

## Online vs Offline Strategy

This project is highly flexible, offering two deployment paths based on privacy and connectivity needs:

| Characteristic | Online Strategy | Offline Strategy (Air-gapped) |
|---|---|---|
| **Primary Use Case** | Cloud deployments with active internet access | Highly secure, air-gapped government environments |
| **LLM Inference** | Connects to cloud APIs (e.g., Groq, OpenAI) | Uses 100% local **Ollama (Gemma)** models |
| **Vector Database** | Hosted Qdrant Cloud | Local Dockerized Qdrant or embedded on-disk Qdrant |
| **Translation** | Google Translate / Deep-Translator online | Local Indic models (e.g., indictranstoolkit) |
| **Data Privacy** | Standard cloud privacy agreements | Maximum privacy (no data leaves the local machine) |
| **Speed** | Dependent on network latency | Extremely fast, limited only by local hardware capabilities |

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14 | React framework and App Router |
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Utility-first styling & Glassmorphism |
| Zustand | 4.x | Lightweight state management |
| Recharts | 2.x | Data visualization (analytics dashboard) |
| Framer Motion | 11.x | Smooth UI animations |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Server runtime and data processing |
| FastAPI | 0.100+ | High-performance REST API |
| Qdrant | — | Vector Database for semantic search |
| Ollama | — | Local LLM runner (Gemma model) |
| FastEmbed | — | Local sentence-transformers for embeddings |
| Deep-Translator| — | External API for multi-language queries |

---

## Project Structure

```text
MoSPI NCO-Code Finder/
│
├── frontend/                     # Next.js Frontend App
│   ├── app/                      # Next.js App Router Pages
│   │   ├── search/               # Main natural language search interface
│   │   ├── batch/                # Bulk CSV processing engine
│   │   ├── metrics/              # Analytics dashboard
│   │   ├── feedback/             # User feedback submission page
│   │   └── layout.tsx            # Root layout and Navbar
│   ├── components/               # Reusable React components (UI, Results, Layout)
│   ├── lib/                      # API handlers and Zustand store logic
│   └── Dockerfile                # Frontend container definition
│
├── backend/                      # FastAPI Backend Server
│   ├── app/                      # Core backend logic
│   │   ├── main.py               # API Endpoints (search, batch, transcribe, feedback)
│   │   ├── normalize.py          # AI query normalization logic
│   │   ├── rerank.py             # LLM reranking logic
│   │   ├── translator.py         # Multi-language translation engine
│   │   ├── qdrant_store.py       # Vector DB interaction
│   │   └── llm_client.py         # Abstraction for Groq/Ollama APIs
│   ├── data/                     # Sample datasets and generated embeddings
│   ├── requirements.txt          # Python dependencies
│   └── Dockerfile                # Backend container definition
│
└── docker-compose.yml            # Full stack deployment configuration
```

---

## Getting Started

### Prerequisites

- **Node.js** `>=18.0.0`
- **Python** `>=3.10`
- **Docker & Docker Compose** (Recommended)
- **Ollama** (Required for offline AI features)

---

### 1. Clone the Repository

```bash
git clone https://github.com/nso-india/mospi-semantic-nco-search-v1.git
cd mospi-semantic-nco-search-v1
```

### 2. Local LLM Setup (Ollama)

MoSPI NCO-Code Finder uses the Gemma model for high-accuracy semantic normalization and reranking. Once [Ollama](https://ollama.com) is installed, start the model:

```bash
ollama run gemma2
```
*Leave the Ollama server running. It binds to `http://localhost:11434`.*

### 3. Docker Deployment (Recommended)

The easiest way to run the full stack (Frontend, Backend, and Qdrant DB):

```bash
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Qdrant REST: `http://localhost:6333`

### 4. Local Installation

If you prefer to run it without Docker:

**Backend Setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `LLM_BASE_URL` | ✅ | `http://localhost:11434/v1` | Ollama API endpoint |
| `LLM_MODEL` | ✅ | `gemma2` | The local LLM model name |
| `QDRANT_URL` | ✅ | `http://qdrant:6333` | Vector Database URL |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE` | ✅ | `http://localhost:8000` | Base URL of the FastAPI backend |

---

## API Endpoints

### Core Search API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/search` | Performs a natural language semantic search with LLM reranking |
| `POST` | `/api/search/batch` | Concurrently processes a CSV of queries returning a JSON mapped output |

### Utility API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/transcribe` | Transcribes audio bytes into text for voice-based search |
| `POST` | `/api/feedback` | Accepts text and image feedback, saving it to the filesystem |
| `POST` | `/api/assign` | Logs user assignments for NCO codes to improve future searches |
| `POST` | `/api/preload` | Wakes up the local Ollama LLM into memory for faster offline searches |

---

## Architecture Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Privacy First** | All embeddings and LLM reranking execute entirely locally, meeting strict government data compliances. |
| **Decoupled Services** | Frontend and Backend scale independently via Docker. |
| **High Concurrency** | Python ThreadPoolExecutors ensure fast batch handling despite local LLM constraints. |

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
1. Adding new datasets or embedding models.
2. Enhancing multilingual capabilities.
3. Improving UI components.

---

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.

---

## Acknowledgments

- Built to support standardizing real-world occupational data into the NCO 2015 framework.
- Powered by [Qdrant](https://qdrant.tech/) and [Ollama](https://ollama.com/) for local inference.
