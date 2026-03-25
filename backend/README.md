# Backend Service

This directory contains the Go proxy backend for `llamactl-console`.

## Quick Start

1. Copy `.env.example` to `.env` and set required values.
2. Run the service (it automatically loads variables from `.env`):

```bash
make run
```

Health endpoints:
- `GET /api/health`
- `GET /api/health/live`
- `GET /api/health/ready`

## Docker (single binary with embedded frontend)

Build from the repository root so Docker can access both `frontend/` and `backend/`:

```bash
docker build -f backend/Dockerfile -t llamactl-console:latest .
```

The resulting image runs one backend binary that serves the built frontend bundle from `/` and API routes from `/api/*`.

Run the built image locally with your backend config:

```bash
docker run --rm \
	--name llamactl-console \
	-p 8000:8000 \
	--env-file backend/.env \
	llamactl-console:latest
```

Then open `http://localhost:8000`.
