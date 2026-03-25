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
	"gopkg.in/yaml.v3"
)

type Config struct {
	Host                     string
	Port                     string
	LlamactlBaseURL          string
	LlamactlManagementAPIKey string
	StorageBackend           string
	StorageSQLitePath        string
	JWTSigningKey            string
	JWTAccessTTL             time.Duration
	JWTRefreshTTL            time.Duration
	BootstrapAdminUsername   string
	BootstrapAdminPassword   string
	ReadTimeout              time.Duration
	WriteTimeout             time.Duration
	IdleTimeout              time.Duration
	ShutdownTimeout          time.Duration
	LogLevel                 slog.Level
	StartedAt                time.Time
}

type fileConfig struct {
	Server struct {
		Host            string `yaml:"host"`
		Port            string `yaml:"port"`
		ReadTimeout     string `yaml:"readTimeOut"`
		WriteTimeout    string `yaml:"writeTimeOut"`
		IdleTimeout     string `yaml:"idleTimeOut"`
		ShutdownTimeout string `yaml:"shutdownTimeOut"`
	} `yaml:"server"`
	Llamactl struct {
		BaseURL          string  `yaml:"baseURL"`
		ManagementAPIKey *string `yaml:"managementAPIKey"`
	} `yaml:"llamactl"`
	Security struct {
		JWTSigningKey string `yaml:"jwtSigningKey"`
		JWTAccessTTL  string `yaml:"jwtAccessTTL"`
		JWTRefreshTTL string `yaml:"jwtRefreshTTL"`
	} `yaml:"security"`
	Bootstrap struct {
		AdminUsername string  `yaml:"adminUsername"`
		AdminPassword *string `yaml:"adminPassword"`
	} `yaml:"bootstrap"`
	Logging struct {
		Level string `yaml:"level"`
	} `yaml:"logging"`
	Storage struct {
		Backend string `yaml:"backend"`
		SQLite  struct {
			Path string `yaml:"path"`
		} `yaml:"sqlite"`
	} `yaml:"storage"`
}

func Load() (Config, error) {
	return LoadFromEnvAndYAML("")
}

func LoadFromEnv() (Config, error) {
	return LoadFromEnvAndYAML("")
}

func LoadFromEnvAndYAML(path string) (Config, error) {
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		return Config{}, fmt.Errorf("failed to load .env: %w", err)
	}
	if strings.TrimSpace(path) == "" {
		path = strings.TrimSpace(os.Getenv("APP_CONFIG_FILE"))
	}

	cfg := Config{
		Port:                     getEnvOrDefault("PORT", "8000"),
		LlamactlBaseURL:          strings.TrimSpace(os.Getenv("LLAMACTL_BASE_URL")),
		LlamactlManagementAPIKey: strings.TrimSpace(os.Getenv("LLAMACTL_MANAGEMENT_API_KEY")),
		StorageBackend:           strings.ToLower(getEnvOrDefault("APP_STORAGE_BACKEND", "inmemory")),
		StorageSQLitePath:        getEnvOrDefault("APP_STORAGE_SQLITE_PATH", "data/llamactl-console.db"),
		JWTSigningKey:            strings.TrimSpace(os.Getenv("APP_JWT_SIGNING_KEY")),
		BootstrapAdminUsername:   getEnvOrDefault("BOOTSTRAP_ADMIN_USERNAME", "admin"),
		BootstrapAdminPassword:   strings.TrimSpace(os.Getenv("BOOTSTRAP_ADMIN_PASSWORD")),
		ReadTimeout:              mustDuration("HTTP_READ_TIMEOUT", "10s"),
		WriteTimeout:             mustDuration("HTTP_WRITE_TIMEOUT", "15s"),
		IdleTimeout:              mustDuration("HTTP_IDLE_TIMEOUT", "60s"),
		ShutdownTimeout:          mustDuration("HTTP_SHUTDOWN_TIMEOUT", "10s"),
		JWTAccessTTL:             mustDuration("APP_JWT_ACCESS_TTL", "15m"),
		JWTRefreshTTL:            mustDuration("APP_JWT_REFRESH_TTL", "168h"),
		LogLevel:                 parseLogLevel(getEnvOrDefault("LOG_LEVEL", "info")),
		StartedAt:                time.Now(),
	}

	if strings.TrimSpace(path) != "" {
		yamlCfg, err := loadFileConfig(path)
		if err != nil {
			return Config{}, err
		}

		applyFileConfig(&cfg, yamlCfg)
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
	if cfg.StorageBackend != "inmemory" && cfg.StorageBackend != "sqlite" {
		return errors.New("APP_STORAGE_BACKEND must be one of: inmemory, sqlite")
	}
	if cfg.StorageBackend == "sqlite" && strings.TrimSpace(cfg.StorageSQLitePath) == "" {
		return errors.New("APP_STORAGE_SQLITE_PATH is required when APP_STORAGE_BACKEND=sqlite")
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

func loadFileConfig(path string) (fileConfig, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return fileConfig{}, fmt.Errorf("failed to read config file: %w", err)
	}

	var cfg fileConfig
	if err := yaml.Unmarshal(raw, &cfg); err != nil {
		return fileConfig{}, fmt.Errorf("failed to parse config file: %w", err)
	}

	if cfg.Llamactl.ManagementAPIKey != nil {
		return fileConfig{}, errors.New("llamactl.managementAPIKey cannot be configured in YAML")
	}
	if cfg.Bootstrap.AdminPassword != nil {
		return fileConfig{}, errors.New("bootstrap.adminPassword cannot be configured in YAML")
	}
	if strings.TrimSpace(cfg.Security.JWTSigningKey) != "" {
		return fileConfig{}, errors.New("security.jwtSigningKey cannot be configured in YAML")
	}

	return cfg, nil
}

func applyFileConfig(cfg *Config, yamlCfg fileConfig) {
	if os.Getenv("HOST") == "" && strings.TrimSpace(yamlCfg.Server.Host) != "" {
		cfg.Host = strings.TrimSpace(yamlCfg.Server.Host)
	}
	if os.Getenv("PORT") == "" && strings.TrimSpace(yamlCfg.Server.Port) != "" {
		cfg.Port = strings.TrimSpace(yamlCfg.Server.Port)
	}
	if os.Getenv("LLAMACTL_BASE_URL") == "" && strings.TrimSpace(yamlCfg.Llamactl.BaseURL) != "" {
		cfg.LlamactlBaseURL = strings.TrimSpace(yamlCfg.Llamactl.BaseURL)
	}
	if os.Getenv("BOOTSTRAP_ADMIN_USERNAME") == "" && strings.TrimSpace(yamlCfg.Bootstrap.AdminUsername) != "" {
		cfg.BootstrapAdminUsername = strings.TrimSpace(yamlCfg.Bootstrap.AdminUsername)
	}
	if os.Getenv("HTTP_READ_TIMEOUT") == "" && strings.TrimSpace(yamlCfg.Server.ReadTimeout) != "" {
		cfg.ReadTimeout = mustDurationString("server.readTimeOut", yamlCfg.Server.ReadTimeout)
	}
	if os.Getenv("HTTP_WRITE_TIMEOUT") == "" && strings.TrimSpace(yamlCfg.Server.WriteTimeout) != "" {
		cfg.WriteTimeout = mustDurationString("server.writeTimeOut", yamlCfg.Server.WriteTimeout)
	}
	if os.Getenv("HTTP_IDLE_TIMEOUT") == "" && strings.TrimSpace(yamlCfg.Server.IdleTimeout) != "" {
		cfg.IdleTimeout = mustDurationString("server.idleTimeOut", yamlCfg.Server.IdleTimeout)
	}
	if os.Getenv("HTTP_SHUTDOWN_TIMEOUT") == "" && strings.TrimSpace(yamlCfg.Server.ShutdownTimeout) != "" {
		cfg.ShutdownTimeout = mustDurationString("server.shutdownTimeOut", yamlCfg.Server.ShutdownTimeout)
	}
	if os.Getenv("APP_JWT_ACCESS_TTL") == "" && strings.TrimSpace(yamlCfg.Security.JWTAccessTTL) != "" {
		cfg.JWTAccessTTL = mustDurationString("security.jwtAccessTTL", yamlCfg.Security.JWTAccessTTL)
	}
	if os.Getenv("APP_JWT_REFRESH_TTL") == "" && strings.TrimSpace(yamlCfg.Security.JWTRefreshTTL) != "" {
		cfg.JWTRefreshTTL = mustDurationString("security.jwtRefreshTTL", yamlCfg.Security.JWTRefreshTTL)
	}
	if os.Getenv("LOG_LEVEL") == "" && strings.TrimSpace(yamlCfg.Logging.Level) != "" {
		cfg.LogLevel = parseLogLevel(yamlCfg.Logging.Level)
	}
	if os.Getenv("APP_STORAGE_BACKEND") == "" && strings.TrimSpace(yamlCfg.Storage.Backend) != "" {
		cfg.StorageBackend = strings.ToLower(strings.TrimSpace(yamlCfg.Storage.Backend))
	}
	if os.Getenv("APP_STORAGE_SQLITE_PATH") == "" && strings.TrimSpace(yamlCfg.Storage.SQLite.Path) != "" {
		cfg.StorageSQLitePath = strings.TrimSpace(yamlCfg.Storage.SQLite.Path)
	}
}

func mustDurationString(name, raw string) time.Duration {
	d, err := time.ParseDuration(strings.TrimSpace(raw))
	if err != nil {
		panic(fmt.Sprintf("invalid duration %q for %s: %v", raw, name, err))
	}
	return d
}
