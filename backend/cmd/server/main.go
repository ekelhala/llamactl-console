package main

import (
	"context"
	"errors"
	"flag"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/ekelhala/llamactl-console/backend/internal/config"
	"github.com/ekelhala/llamactl-console/backend/internal/httpserver"
)

func main() {
	configPath := parseConfigPath(os.Args[1:])

	cfg, err := config.LoadFromEnvAndYAML(configPath)
	if err != nil {
		slog.Error("failed to load configuration", "error", err)
		os.Exit(1)
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel}))
	slog.SetDefault(logger)

	srv := httpserver.New(cfg, logger)

	errCh := make(chan error, 1)
	go func() {
		logger.Info("starting backend server", "address", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	shutdownCtx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	select {
	case err := <-errCh:
		logger.Error("server exited unexpectedly", "error", err)
		os.Exit(1)
	case <-shutdownCtx.Done():
		logger.Info("shutdown signal received")
	}

	ctx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("graceful shutdown failed", "error", err)
		os.Exit(1)
	}

	logger.Info("server stopped", "uptime", time.Since(cfg.StartedAt).String())
}

func parseConfigPath(args []string) string {
	flags := flag.NewFlagSet("server", flag.ExitOnError)
	configPath := flags.String("config", "config.yaml", "Path to configuration file")
	flags.Parse(args)

	configFlagExplicitlySet := false
	flags.Visit(func(f *flag.Flag) {
		if f.Name == "config" {
			configFlagExplicitlySet = true
		}
	})
	if configFlagExplicitlySet {
		return *configPath
	}

	if envPath := strings.TrimSpace(os.Getenv("APP_CONFIG_FILE")); envPath != "" {
		return envPath
	}

	return *configPath
}
