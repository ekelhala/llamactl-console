package config

import (
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                     string
	LlamactlBaseURL          string
	LlamactlManagementAPIKey string
	JWTSigningKey            string
	JWTAccessTTL             time.Duration
	JWTRefreshTTL            time.Duration
	BootstrapAdminUsername   string
	BootstrapAdminPassword   string
	CORSAllowedOrigin        string
	ReadTimeout              time.Duration
	WriteTimeout             time.Duration
	IdleTimeout              time.Duration
	ShutdownTimeout          time.Duration
	LogLevel                 slog.Level
	StartedAt                time.Time
}

func LoadFromEnv() (Config, error) {
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		return Config{}, fmt.Errorf("failed to load .env: %w", err)
	}

	cfg := Config{
		Port:                     getEnvOrDefault("PORT", "8000"),
		LlamactlBaseURL:          strings.TrimSpace(os.Getenv("LLAMACTL_BASE_URL")),
		LlamactlManagementAPIKey: strings.TrimSpace(os.Getenv("LLAMACTL_MANAGEMENT_API_KEY")),
		JWTSigningKey:            strings.TrimSpace(os.Getenv("APP_JWT_SIGNING_KEY")),
		BootstrapAdminUsername:   getEnvOrDefault("BOOTSTRAP_ADMIN_USERNAME", "admin"),
		BootstrapAdminPassword:   strings.TrimSpace(os.Getenv("BOOTSTRAP_ADMIN_PASSWORD")),
		CORSAllowedOrigin:        getEnvOrDefault("CORS_ALLOWED_ORIGIN", "http://localhost:5173"),
		ReadTimeout:              mustDuration("HTTP_READ_TIMEOUT", "10s"),
		WriteTimeout:             mustDuration("HTTP_WRITE_TIMEOUT", "15s"),
		IdleTimeout:              mustDuration("HTTP_IDLE_TIMEOUT", "60s"),
		ShutdownTimeout:          mustDuration("HTTP_SHUTDOWN_TIMEOUT", "10s"),
		JWTAccessTTL:             mustDuration("APP_JWT_ACCESS_TTL", "15m"),
		JWTRefreshTTL:            mustDuration("APP_JWT_REFRESH_TTL", "168h"),
		LogLevel:                 parseLogLevel(getEnvOrDefault("LOG_LEVEL", "info")),
		StartedAt:                time.Now(),
	}

	if err := validate(cfg); err != nil {
		return Config{}, err
	}

	return cfg, nil
}

func validate(cfg Config) error {
	var missing []string

	if cfg.LlamactlBaseURL == "" {
		missing = append(missing, "LLAMACTL_BASE_URL")
	}
	if cfg.LlamactlManagementAPIKey == "" {
		missing = append(missing, "LLAMACTL_MANAGEMENT_API_KEY")
	}
	if cfg.JWTSigningKey == "" {
		missing = append(missing, "APP_JWT_SIGNING_KEY")
	}
	if cfg.JWTSigningKey != "" && len(cfg.JWTSigningKey) < 32 {
		return errors.New("APP_JWT_SIGNING_KEY must be at least 32 characters")
	}
	if cfg.JWTAccessTTL <= 0 {
		return errors.New("APP_JWT_ACCESS_TTL must be greater than zero")
	}
	if cfg.JWTRefreshTTL <= 0 {
		return errors.New("APP_JWT_REFRESH_TTL must be greater than zero")
	}

	if len(missing) > 0 {
		return fmt.Errorf("missing required environment variables: %s", strings.Join(missing, ", "))
	}

	return nil
}

func getEnvOrDefault(name, fallback string) string {
	v := strings.TrimSpace(os.Getenv(name))
	if v == "" {
		return fallback
	}
	return v
}

func mustDuration(name, fallback string) time.Duration {
	raw := getEnvOrDefault(name, fallback)
	d, err := time.ParseDuration(raw)
	if err != nil {
		panic(fmt.Sprintf("invalid duration %q for %s: %v", raw, name, err))
	}
	return d
}

func parseLogLevel(level string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func BoolFromEnv(name string, defaultValue bool) bool {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return defaultValue
	}

	parsed, err := strconv.ParseBool(raw)
	if err != nil {
		return defaultValue
	}

	return parsed
}
