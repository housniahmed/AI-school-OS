# AI School OS

AI-Powered School Resource Management System for Moroccan schools.

## Current baseline

**V0.3 — AI-ready operational core**.

This repository consolidates the work produced during the initial product-build sessions. The historical milestones V0.1 and V0.2 are documented rather than represented as synthetic Git history.

## Milestones

- **V0.1 — Product Foundation**: product vision, MVP scope, multi-tenant architecture, domain model, AI tool registry principles.
- **V0.2 — Secure Operational Core**: JWT authentication, RBAC, tenant isolation, assets, maintenance, dashboard and audit foundation.
- **V0.3 — AI-Ready School Core**: students/guardians, finance, inventory, QR assets, knowledge documents, lexical retrieval foundation and OpenAI-compatible tool calling.

## Principles

1. Multi-tenant by design.
2. Least-privilege access and role-based permissions.
3. AI accesses business capabilities through controlled tools, never arbitrary SQL.
4. Sensitive mutations require explicit authorization/confirmation flows.
5. Auditability is a first-class requirement.
6. Moroccan deployment requirements, including personal-data compliance, are considered from the architecture stage.

## Local development

See `docs/` and the application README for setup and API smoke tests.

## Validation note

The synchronized code has been statically reviewed. Complete runtime/build validation still needs to be performed in an environment with Docker and npm dependency access.
