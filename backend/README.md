# Backend Service

This directory contains the Go proxy backend for `llamactl-console`.

## Quick Start

1. Copy `.env.example` to `.env` and set required values.
2. (Optional) Copy `config.example.yaml` and set `APP_CONFIG_FILE` to its path.
3. Start the service.

```bash
make run
```

Configuration precedence:
- environment variables and `.env` values (highest priority)
- YAML file values from `APP_CONFIG_FILE`
- built-in defaults

Sensitive values are intentionally not accepted from YAML and must come from env/.env:
- `LLAMACTL_MANAGEMENT_API_KEY`
- `APP_JWT_SIGNING_KEY`
- `BOOTSTRAP_ADMIN_PASSWORD`

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
