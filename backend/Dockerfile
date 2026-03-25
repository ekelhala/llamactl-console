FROM oven/bun:1.2.11-alpine AS frontend-builder
WORKDIR /src/frontend

COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile

COPY frontend/ ./
RUN bun run build

FROM golang:1.22-alpine AS backend-builder
WORKDIR /src/backend

COPY backend/go.mod ./
RUN go mod download

COPY backend/ ./
COPY --from=frontend-builder /src/frontend/dist ./internal/httpserver/web/dist

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/server ./cmd/server

FROM alpine:3.20
RUN apk add --no-cache ca-certificates \
	&& adduser -D -g '' appuser
USER appuser
WORKDIR /app

COPY --from=backend-builder /out/server ./server

EXPOSE 8000
ENTRYPOINT ["/app/server"]
