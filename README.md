# Contextual Product AI

A local-first Retrieval-Augmented Generation (RAG) system that answers product queries using strict semantic retrieval and context-constrained generation. Built to minimize hallucination and deliver transparent, source-grounded responses.

**Live Demo:** [your-link-here] &nbsp;|&nbsp; **Stack:** Next.js 14 · Supabase pgvector · Gemini 2.5 Flash · TypeScript

---

## Overview

Most AI assistants hallucinate. This system doesn't — by design.

Every response is grounded strictly in retrieved product data. If the answer isn't in the context, the system says so explicitly rather than guessing. Sources and confidence signals are exposed directly in the UI so users can verify every claim.

---

## Architecture

```
User Query
  → Local Embedding        (MiniLM-L6-v2 via @xenova/transformers)
  → Vector Search          (Supabase pgvector, cosine similarity)
  → Threshold Filtering    (weak matches rejected outright)
  → Context Selection      (top-K relevant chunks passed to LLM)
  → Gemini Generation      (strictly constrained to retrieved context)
  → Grounded Response      (with sources + confidence displayed in UI)
```

### Embedding Pipeline

Product data is chunked and embedded locally using `all-MiniLM-L6-v2` (384-dimensional) via `@xenova/transformers`. All indexing runs client-side — no external API calls, no cost, fully deterministic.

### Vector Storage & Retrieval

Embeddings are stored in Supabase PostgreSQL with the `pgvector` extension. Retrieval uses cosine similarity via an RPC call for efficient top-K search:

```sql
similarity = 1 - (embedding <=> query_embedding)
```

### Threshold Filtering

A similarity threshold is applied before generation. Chunks below the threshold are discarded. If no chunk passes:

```
❌ I couldn't find this in the product data.
```

This prevents the LLM from generating unsupported responses entirely.

### Generation Layer

Google Gemini (`gemini-2.5-flash`) generates responses strictly constrained to retrieved context via system prompt. External knowledge is explicitly disallowed.

### UI Layer

Every response surfaces:
- **Confidence level** — derived from top chunk similarity score
- **Primary and secondary sources** — the exact chunks used
- **Retrieved context snippets** — full traceability for every answer

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Frontend | React, Tailwind CSS |
| Database | Supabase PostgreSQL (pgvector) |
| Embeddings | @xenova/transformers (local, MiniLM-L6-v2) |
| LLM | Google Gemini 2.5 Flash |
| Text Processing | LangChain (chunking) |

---

## Design Decisions

**Local embeddings over API-based embeddings**
Eliminates per-request indexing cost and makes embedding deterministic and reproducible. The `@xenova/transformers` library runs entirely in Node.js with no external dependency.

**Threshold-based retrieval over naive top-K**
Top-K always returns results even when none are relevant. Threshold filtering rejects weak matches before they reach the LLM, directly reducing hallucination surface.

**Source exposure in UI**
Transparency is a first-class feature, not an afterthought. Users can verify every answer against the exact retrieved chunks, which builds trust and makes failure modes visible.

**Minimal architecture**
One database, one LLM, one embedding model. Easier to reason about, debug, and extend than a multi-service setup.

---

## Setup & Run

### Prerequisites
- Node.js 18+
- Supabase project with `pgvector` extension enabled
- Google Gemini API key

### 1. Clone and install

```bash
git clone https://github.com/your-username/contextual-product-ai
cd contextual-product-ai
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Set up Supabase vector table

Run this in the Supabase SQL editor:

```sql
create extension if not exists vector;

create table product_embeddings (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(384)
);

create or replace function match_products(
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    id, content, metadata,
    1 - (embedding <=> query_embedding) as similarity
  from product_embeddings
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
```

### 4. Embed product data

```bash
npm run embed
```

### 5. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Key Outcomes

- **Zero hallucination by design** — threshold filtering ensures the LLM only generates when context is sufficient
- **Local-first indexing** — no API cost or rate limits for embedding
- **Full traceability** — every response is traceable to exact source chunks
- **Production-ready uncertainty handling** — explicit refusal when context is insufficient

---
