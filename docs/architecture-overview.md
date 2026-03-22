# Architecture Overview

## Purpose

llamactl-console is a management UI for llamactl that keeps the upstream management API key out of the browser.

The frontend talks only to a local proxy backend. The proxy backend authenticates users, applies policy, and forwards approved requests to llamactl.

## MVP Scope

Included:
- Instances management
  - List/get/create/update/delete instances
  - Start/stop/restart instances
  - View instance logs
- API key management
  - List/get/create/delete keys
  - View key permissions

Not in MVP:
- Model cache/download workflows
- Nodes/system dashboards
- OpenAI proxy UI
- Advanced backend command parsing UX

## Architecture Goals

- Security: Never expose the upstream management key to browser clients.
- Separation: Keep UI concerns separate from upstream integration and policy enforcement.
- Extensibility: Support migration from simple local auth to JWT/OAuth without breaking frontend APIs.
- Operability: Keep local development simple and production deployment reproducible.

## System Context

```mermaid
flowchart LR
  U[User Browser]
  F[React Frontend]
  B[Go Proxy Backend]
  L[llamactl API]

  U --> F
  F -->|HTTP /api/*| B
  B -->|ApiKeyAuth header| L
```

## Core Components

### Frontend (React + shadcn UI)

Responsibilities:
- Render management pages and forms.
- Call proxy endpoints only.
- Handle loading, empty, and error states.
- Keep auth/session state for logged-in users.

Non-responsibilities:
- Storing or sending upstream management credentials.
- Direct calls to llamactl.

### Backend (Go Proxy)

Responsibilities:
- Authenticate app users.
- Authorize allowed actions.
- Forward supported API calls to llamactl.
- Add upstream `ApiKeyAuth` header from server-side configuration.
- Normalize upstream errors into stable frontend-safe responses.
- Emit structured logs and health endpoints.

Non-responsibilities:
- Re-implementing llamactl business logic.
- Persisting model or instance state outside required app auth/session data.

### Upstream (llamactl)

Responsibilities:
- Manage instances, keys, models, nodes, and system behavior.
- Enforce upstream key-based access control.

## Trust Boundaries

Boundary 1: Browser <-> Proxy
- User-facing auth/session boundary.
- CORS restricted to known frontend origin.
- Optional CSRF protection when cookie-based session auth is used.

Boundary 2: Proxy <-> llamactl
- Machine-to-machine trust using management API key.
- Key lives only in backend runtime environment.
- Outbound timeouts and retries controlled by proxy.

## Authentication and Authorization Strategy

Current direction:
- Per-user auth at proxy layer.
- Start with local user/session mechanism suitable for self-hosted environments.

Future direction:
- Swap identity provider to JWT/OAuth without changing frontend route contracts.
- Preserve same authorization checks in backend handlers.

## API Design Principles

- Prefix all proxy endpoints under `/api`.
- Keep frontend contract stable even if upstream payloads change.
- Translate upstream errors (400/404/409/500) into consistent error envelope.
- Pass through only required headers and request bodies.
- Explicitly block unknown or out-of-scope endpoints.

Example endpoint groups:
- `/api/instances/*`
- `/api/keys/*`
- `/api/health`

## Request Flow Examples

### Start Instance

1. Frontend sends `POST /api/instances/{name}/start` to proxy.
2. Proxy authenticates user and checks authorization.
3. Proxy forwards to llamactl `POST /api/v1/instances/{name}/start` with `ApiKeyAuth`.
4. Proxy returns normalized response to frontend.

### Create API Key

1. Frontend sends `POST /api/keys` with key options.
2. Proxy validates request and user permission.
3. Proxy forwards to llamactl `POST /api/v1/auth/keys` with `ApiKeyAuth`.
4. Proxy returns created key metadata to frontend.

## Deployment Topology

### Development

- Frontend and backend run as separate processes.
- Frontend uses local dev server and proxies API calls to backend origin.
- Backend reads local environment variables for upstream target and management key.

### Production-like Local/CI

- Run frontend + backend (and optional local llamactl) with docker-compose.
- Pin explicit service-to-service network aliases and ports.

## Configuration

Expected backend configuration variables:
- `PORT`: Proxy listen port.
- `LLAMACTL_BASE_URL`: Upstream llamactl base URL.
- `LLAMACTL_MANAGEMENT_API_KEY`: Upstream management key (secret).
- `APP_AUTH_SECRET`: Signing/encryption secret for app auth sessions/tokens.
- `CORS_ALLOWED_ORIGIN`: Frontend origin allowed to call proxy.

## Security Baseline

- Never log secrets or full credentials.
- Redact sensitive headers in logs.
- Enforce request size limits.
- Apply conservative upstream timeout defaults.
- Return generic auth errors to clients.

## Observability Baseline

- Structured JSON logs for request lifecycle.
- Request ID generation and propagation.
- Basic metrics targets:
  - Request latency
  - Upstream error rate
  - Auth failures
- Readiness and liveness endpoints.

## Testing Strategy

Backend:
- Unit tests for auth middleware and authorization checks.
- Handler tests for route forwarding and error translation.
- Upstream client tests for timeout and retry behavior.

Frontend:
- Component tests for critical forms and action buttons.
- Integration tests for instance lifecycle and key management flows using mocked proxy API.

End-to-end:
- Smoke tests against a running llamactl instance to confirm full path behavior.

## Repository Layout (Planned)

```text
/
  docs/
    architecture-overview.md
  frontend/
    ... React app ...
  backend/
    ... Go proxy ...
  docker-compose.yml
  README.md
```

## Risks and Mitigations

- Upstream API drift:
  - Mitigation: centralize upstream client and response mapping.
- Auth complexity growth:
  - Mitigation: keep auth interface and middleware pluggable from day one.
- Proxy becoming a generic tunnel:
  - Mitigation: allowlist endpoints and methods explicitly.

## Next Implementation Milestones

1. Scaffold backend service and define route contracts for instances and keys.
2. Scaffold frontend app with shadcn UI shell and navigation.
3. Implement first vertical slice: list instances + start/stop actions.
4. Implement key management page and create/delete actions.
5. Add tests and compose-based smoke workflow.
