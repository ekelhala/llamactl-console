# Backend Service

This directory contains the Go proxy backend for `llamactl-console`.

## Quick Start

1. Copy `.env.example` to `.env` and set required values.
2. Copy the example config into `config.yaml`.
3. Start the service.

```bash
cp config.example.yaml config.yaml
make run
```

You can override the config file location with `--config`:

```bash
go run ./cmd/server --config ./config.local.yaml
```

Configuration precedence:
- Config file path: `--config` command-line option (default: `config.yaml`), then `APP_CONFIG_FILE` when `--config` is not provided
- For values inside the selected config file, environment variables and `.env` values override YAML values (highest priority)
- built-in defaults

Sensitive values are intentionally not accepted from YAML and must come from env/.env:
- `LLAMACTL_MANAGEMENT_API_KEY`
- `APP_JWT_SIGNING_KEY`
- `BOOTSTRAP_ADMIN_PASSWORD`

Storage configuration:
- `APP_STORAGE_BACKEND` (or `storage.backend` in YAML): `inmemory` (default) or `sqlite`
- `APP_STORAGE_SQLITE_PATH` (or `storage.sqlite.path` in YAML): SQLite database file path (default: `data/llamactl-console.db`)
- When `sqlite` is selected, the database file is created automatically at startup if it does not exist.

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
	-v "$(pwd)/backend/config.yaml:/app/config.yaml:ro" \
	--env-file backend/.env \
	llamactl-console:latest
```

Then open `http://localhost:8000`.
