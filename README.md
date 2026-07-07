<!--
  Easter egg: hidden developer credits for MoSPI NCO-Code Finder.

  Made with love by:
    - The MoSPI NCO-Code Finder Team

  Welcome, traveler. You found the hidden credits. Status: Legendary.
-->
# MoSPI NCO-Code Finder — AI Occupation Intelligence

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)

MoSPI NCO-Code Finder is an advanced, AI-powered semantic search and classification engine designed to seamlessly map messy, real-world, and multilingual job titles to standard **NCO 2015 (National Classification of Occupations)** codes.

By leveraging cutting-edge Vector Databases, fully local LLM-based reranking (Gemma via Ollama), and multilingual translation models, MoSPI NCO-Code Finder transforms how occupational data is standardized across India and beyond, entirely on your own hardware without relying on closed-source APIs.

---

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Online vs Offline Strategy](#online-vs-offline-strategy)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Docker Deployment (Recommended)](#docker-deployment-recommended)
  - [Local Installation](#local-installation)
- [Architecture](#architecture)
- [Usage Instructions](#usage-instructions)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## Overview

MoSPI NCO-Code Finder provides AI-ready access to standardized occupational data. It acts as a bridge between raw, unstructured job titles entered by citizens and the official NCO 2015 framework.

**Key Features:**
- Natural language search in English, Hindi, Bengali, Tamil, and more.
- Fully local LLM-powered reranking for maximum privacy (no data sent to OpenAI/Groq).
- Blazing fast concurrent batch processing for massive CSV datasets.
- Interactive Recharts-based metrics dashboard for real-time analytics.
- Production-ready Docker deployment.

---

## Core Features

| Feature | Description | Use For |
|---------|-------------|---------|
| **Multilingual Search** | Language-agnostic search with auto-response translation | Querying in native regional languages |
| **Batch Processing** | High-speed concurrent CSV classification | Standardizing massive historical datasets |
| **Local LLM Reranking** | Gemma model integration via Ollama | Contextual understanding of slang and typos |
| **Analytics Dashboard** | Real-time monitoring of performance and languages | Tracking API latency and usage metrics |
| **UI Translation** | Global Google Translate module in the Navbar | Instant localization of the entire web app |
| **User Feedback System** | Card-style interface for text and image issue reporting | Collecting user feedback and UI bugs |

---

## Online vs Offline Strategy

This project is designed to be highly flexible, offering two main deployment strategies based on your data privacy and connectivity requirements.

| Characteristic | Online Strategy | Offline Strategy (Air-gapped) |
|----------------|-----------------|-------------------------------|
| **Primary Use Case** | Cloud deployments with active internet access | Highly secure, air-gapped government environments |
| **LLM Inference** | Can connect to cloud APIs (e.g., Groq, OpenAI) | Uses 100% local **Ollama (Gemma)** models |
| **Vector Database** | Hosted Qdrant Cloud | Local Dockerized Qdrant or embedded on-disk Qdrant |
| **Translation** | Google Translate / Deep-Translator online | Local Indic models (e.g., indictranstoolkit) |
| **Data Privacy** | Standard cloud privacy agreements | Maximum privacy (no data ever leaves the local machine) |
| **Speed** | Dependent on network latency | Extremely fast, limited only by local hardware capabilities |

---

## Technology Stack

The platform is split into a modern decoupled architecture:

**Frontend:**
- Next.js 14 (App Router)
- React & TypeScript
- Tailwind CSS (Custom themes & Glassmorphism UI)
- Zustand (State Management)
- Recharts (Data Visualization)

**Backend:**
- Python & FastAPI
- Qdrant (Vector Database)
- FastEmbed (Local sentence-transformers)
- Ollama (Local LLM runner for Gemma)
- Deep-Translator (Multilingual support)

---

## Quick Start

### Prerequisites
- **Docker & Docker Compose** (Recommended)
- **Node.js** (v18+) and **Python** (v3.10+) (For local setup)
- **Ollama**: Download from [ollama.com](https://ollama.com)

### 1. Setup Local LLM (Ollama)
MoSPI NCO-Code Finder uses the Gemma model for high-accuracy semantic normalization and reranking. Once Ollama is installed, start the model:

```bash
ollama run gemma2
```
*Leave the Ollama server running. It binds to `http://localhost:11434`.*

### Docker Deployment (Recommended)

The easiest way to run the full stack (Frontend, Backend, and Qdrant DB):

```bash
git clone https://github.com/nso-india/mospi-semantic-nco-search-v1.git
cd mospi-semantic-nco-search-v1

# Build and start all services
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Qdrant REST: `http://localhost:6333`

### Local Installation

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

## Architecture

```text
MoSPI NCO-Code Finder/
├── backend/                  # FastAPI Backend Server
│   ├── app/                  # Endpoints, LLM client, Qdrant store
│   ├── data/                 # Sample datasets and embeddings
│   ├── requirements.txt      # Python dependencies
│   └── Dockerfile            # Backend container definition
├── frontend/                 # Next.js Frontend App
│   ├── app/                  # Pages, layout, routing
│   ├── components/           # React UI components (batch, results, layout)
│   ├── lib/                  # State management, API hooks
│   └── Dockerfile            # Frontend container definition
├── docker-compose.yml        # Full stack deployment configuration
└── README.md                 # Project documentation
```

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Privacy First** | All embeddings and LLM reranking execute entirely locally. |
| **Decoupled Services** | Frontend and Backend scale independently via Docker. |
| **High Concurrency** | ThreadPoolExecutor in FastAPI ensures fast CSV batch handling. |

---

## Usage Instructions

1. **Access the App**: Navigate to `http://localhost:3000`.
2. **Search Manually**: Use the main dashboard to test single queries in any language.
3. **Batch Process**: Navigate to the "Batch Coding" tab, upload a CSV, and watch the concurrent classification.
4. **View Metrics**: Click "Metrics" in the navigation bar to see real-time analytics.
5. **Change UI Language**: Use the dropdown in the top-right to translate the interface.

---

## Configuration

Environment variables can be customized in the respective `.env` files:

**Backend (`backend/.env`):**
| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_BASE_URL` | Ollama API endpoint | `http://localhost:11434/v1` |
| `LLM_MODEL` | LLM Model Name | `gemma2` |
| `QDRANT_URL` | Vector DB URL | `http://qdrant:6333` |

**Frontend (`frontend/.env.local`):**
| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE` | Backend API URL | `http://localhost:8000` |

---

## Contributing

We welcome contributions! Please feel free to submit a Pull Request.
- Adding new datasets or embedding models.
- Enhancing multilingual capabilities.
- Improving UI components.

---

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.

---

## Acknowledgments

Built to support standardizing real-world occupational data into the NCO 2015 framework. 
