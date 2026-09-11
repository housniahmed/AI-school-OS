# AI School OS — V0.6

AI-Powered School Resource Management System for Moroccan schools.

## Current baseline

**V0.5 security and observability foundation is merged.** V0.6 is the production observability and reliability hardening line.

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

## V0.6 production-reliability work

- Centralized production secret-management contract.
- Prometheus-compatible metrics with privacy-safe labels.
- OpenTelemetry-compatible distributed tracing.
- Dependency and container vulnerability scanning.
- Encrypted backup and explicit retention controls.
- Disaster-recovery exercises with measured RPO/RTO.
- Privacy/CNDP engineering-readiness controls.

Architecture and release gates are documented in `docs/V0.6-ARCHITECTURE.md`.

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

A release candidate is not considered runtime-validated until GitHub Actions reports successful API and Web runs for the change set.

## Important

This remains a product-development baseline, not a compliance-certified production deployment. Before a real school pilot, complete the V0.6 release gates and the documented privacy/CNDP assessment. Do not describe the product as CNDP-compliant without the applicable legal review and process-specific status being established.
