package httpserver

import (
	"net/http"

	"github.com/ekelhala/llamactl-console/backend/internal/handlers"
	"github.com/go-chi/chi/v5"
)

func NewRouter(health *handlers.HealthHandler, proxy http.Handler) http.Handler {
	r := chi.NewRouter()

	r.Get("/api/health", health.Health)
	r.Get("/api/health/live", health.Liveness)
	r.Get("/api/health/ready", health.Readiness)

	// Keep upstream route contracts intact by forwarding everything else as-is.
	r.Handle("/api", proxy)
	r.Handle("/api/*", proxy)

	return r
}
