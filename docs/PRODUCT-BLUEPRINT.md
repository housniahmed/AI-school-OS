# Product Blueprint — AI School OS

## Vision
AI School OS is a modular, multi-tenant school resource management platform designed to centralize operational data and expose controlled AI-assisted workflows.

## Core domains
- Identity, authentication and RBAC
- Tenant isolation
- Students and guardians
- Finance
- Inventory
- Assets and QR identification
- Maintenance
- Knowledge documents
- Dashboard and operational analytics
- AI assistant and controlled tools

## AI architecture principles
The assistant operates through an explicit tool registry. Business actions are executed by domain services under tenant and permission checks. The AI layer must not receive unrestricted database access.

## Roadmap
V0.1 Product foundation → V0.2 secure operational core → V0.3 AI-ready operational core → V0.4 production hardening, tests, observability and deployment.
