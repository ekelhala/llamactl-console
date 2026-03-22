package httpserver

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/ekelhala/llamactl-console/backend/internal/config"
	"github.com/ekelhala/llamactl-console/backend/internal/handlers"
)

func New(cfg config.Config, logger *slog.Logger) *http.Server {
	healthHandler := handlers.NewHealthHandler(cfg.StartedAt)
	proxyHandler := NewUpstreamProxy(cfg, logger)
	router := NewRouter(healthHandler, proxyHandler)

	handler := requestIDMiddleware(loggerMiddleware(logger, router))

	return &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      handler,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
	}
}
