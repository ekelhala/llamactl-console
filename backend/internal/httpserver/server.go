package httpserver

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/ekelhala/llamactl-console/backend/internal/auth"
	"github.com/ekelhala/llamactl-console/backend/internal/config"
	"github.com/ekelhala/llamactl-console/backend/internal/handlers"
)

func New(cfg config.Config, logger *slog.Logger) *http.Server {
	userStore, refreshStore, err := newAuthStores(cfg)
	if err != nil {
		panic(fmt.Sprintf("failed to initialize auth stores: %v", err))
	}

	authService, err := auth.NewService(cfg.JWTSigningKey, cfg.JWTAccessTTL, cfg.JWTRefreshTTL, userStore, refreshStore)
	if err != nil {
		panic(fmt.Sprintf("failed to initialize auth service: %v", err))
	}

	bootstrapPassword, created, err := authService.BootstrapAdmin(cfg.BootstrapAdminUsername, cfg.BootstrapAdminPassword)
	if err != nil {
		panic(fmt.Sprintf("failed to bootstrap admin user: %v", err))
	}
	if created {
		if bootstrapPassword != "" {
			logger.Warn("bootstrap admin user created", "username", cfg.BootstrapAdminUsername, "temporary_password", bootstrapPassword, "must_rotate_password", true)
		} else {
			logger.Info("bootstrap admin user created", "username", cfg.BootstrapAdminUsername)
		}
	}

	healthHandler := handlers.NewHealthHandler(cfg.StartedAt)
	authHandler := auth.NewHTTPHandler(authService)
	proxyHandler := NewUpstreamProxy(cfg, logger)
	frontendHandler := NewFrontendHandler(logger)
	router := NewRouter(healthHandler, authHandler, proxyHandler, frontendHandler)

	handler := requestIDMiddleware(loggerMiddleware(logger, router))

	return &http.Server{
		Addr:         fmt.Sprintf("%s:%s", cfg.Host, cfg.Port),
		Handler:      handler,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
	}
}

func newAuthStores(cfg config.Config) (auth.UserStore, auth.RefreshStore, error) {
	switch cfg.StorageBackend {
	case "sqlite":
		users, refresh, err := auth.NewSQLiteStores(cfg.StorageSQLitePath)
		if err != nil {
			return nil, nil, err
		}
		return users, refresh, nil
	case "inmemory", "":
		return auth.NewInMemoryUserStore(), auth.NewInMemoryRefreshStore(), nil
	default:
		return nil, nil, fmt.Errorf("unsupported storage backend: %s", cfg.StorageBackend)
	}
}
