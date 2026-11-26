# Second Brain

Personal knowledge base with quick capture, searchable notes, and an Ask mode grounded in what you have saved.

## Local development

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Without `DATABASE_URL`, notes run on in-memory PGlite. Without `AI_GATEWAY_API_KEY`, Ask runs in sample retrieval mode.

## Stack

- Next.js App Router
- Postgres (published) / PGlite (local)
- Vercel AI SDK + AI Gateway for live answers
