package httpserver

import (
	"net/http"

	"github.com/ekelhala/llamactl-console/backend/internal/auth"
	"github.com/ekelhala/llamactl-console/backend/internal/handlers"
	"github.com/go-chi/chi/v5"
)

func NewRouter(health *handlers.HealthHandler, authHandler *auth.HTTPHandler, proxy http.Handler) http.Handler {
	r := chi.NewRouter()

	r.Get("/api/health", health.Health)
	r.Get("/api/health/live", health.Liveness)
	r.Get("/api/health/ready", health.Readiness)
	r.Post("/api/auth/login", authHandler.Login)
	r.Post("/api/auth/refresh", authHandler.Refresh)
	r.Post("/api/auth/logout", authHandler.Logout)
	r.With(authHandler.RequireAccessToken).Get("/api/auth/me", authHandler.Me)

	// Proxy all non-reserved /api routes through auth to preserve pass-through behavior
	// while keeping explicit auth and health endpoints managed locally.
	r.With(authHandler.RequireAccessToken).Handle("/api", proxy)
	r.With(authHandler.RequireAccessToken).Handle("/api/*", proxy)

	return r
}
