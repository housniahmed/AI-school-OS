# AI School OS — V0.5

AI-Powered School Resource Management System for Moroccan schools.

## Current baseline

This repository is now on the **V0.5 security and observability line**.

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

## V0.5 production-core controls

- Redis-backed distributed rate limiting.
- Dedicated stricter login rate limiting.
- Structured request logs with request IDs, latency and tenant/user context.
- PostgreSQL + Redis readiness checks.
- Explicit trusted-proxy configuration.
- Graceful startup/shutdown lifecycle.
- Integration tests covering Redis readiness and HTTP security headers.
- PostgreSQL backup/restore runbook.

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

## Validation policy

V0.5 is not considered runtime-validated until GitHub Actions reports a successful API and Web run for the change set.

## Important

This remains a product-development baseline, not a compliance-certified production deployment. Before a real school pilot, complete centralized secrets management, vulnerability scanning, encrypted backups, retention policies, disaster-recovery exercises, production observability/alerting and a documented privacy/CNDP assessment.
