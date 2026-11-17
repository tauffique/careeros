# KarriereOS

KarriereOS is a multi-tenant RAG (retrieval-augmented generation) platform for job applications. Each tenant has its own data, and an LLM assistant answers questions over that data.

**Live:** deployed on Vercel (frontend) and Railway (backend), currently with 10 test tenants.

## Features

- Multi-tenant architecture: each tenant's data is kept separate
- Hybrid retrieval: embeddings, BM25 keyword search and cross-encoder reranking
- LLM assistant built on the Claude API, answering questions over the retrieved content

## Tech stack

- **Backend:** Python, FastAPI, PostgreSQL
- **Frontend:** React
- **AI:** Claude API, embeddings, cross-encoder reranking
- **Deployment:** Vercel, Railway

## Status

Working prototype with 10 test tenants. Not yet tested with real users.

## Author

Mohammad Tauffique Umar — M.Sc. Computer and Systems Engineering, TU Ilmenau
