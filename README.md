# AI School OS — V0.4.1

AI-Powered School Resource Management System for Moroccan schools.

## Current baseline

This repository is now on the **V0.4.1 production-core hardening line**.

### Core capabilities

- Multi-tenant PostgreSQL/Prisma domain model.
- JWT authentication and database-backed RBAC.
- Students and guardians.
- Assets/equipment with QR codes.
- Maintenance workflows.
- Inventory and stock thresholds.
- Finance summaries, invoices and outstanding balances.
- Internal knowledge base with chunking and retrieval foundation.
- Permission-aware AI copilot with controlled tools.
- Optional OpenAI Responses API integration.
- Local fallback mode without an AI API key.
- Audit trail for authentication, mutations and AI tool execution.

## V0.4.1 production gate

- Versioned Prisma PostgreSQL migration.
- Database readiness health check.
- CI against PostgreSQL 16.
- API build and automated tests.
- Integration coverage for authentication and tenant isolation.
- Production JWT secret validation.
- Request correlation IDs.

## Local development

Backend: `http://localhost:4000`
Frontend: `http://localhost:5173`

Demo credentials are development-only and must never be reused for production.

## Start

1. `docker compose up -d`
2. `cd apps/api && cp .env.example .env && npm install`
3. `npm run prisma:generate`
4. `npm run prisma:migrate:deploy`
5. `npm run prisma:seed`
6. `npm run dev`
7. In another terminal: `cd apps/web && npm install && npm run dev`

## Optional AI

Set `OPENAI_API_KEY` in `apps/api/.env` to activate the OpenAI Responses API agent. Without it, the local fallback answers operational questions through the same permission-aware tools.

## Important

This remains a product-development baseline, not a compliance-certified production deployment. Before a real school pilot, complete secrets management, rate limiting, object storage, backups, retention policies, observability, disaster-recovery procedures and a documented privacy/CNDP assessment.
