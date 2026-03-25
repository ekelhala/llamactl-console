package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestLoadFromEnvSuccess(t *testing.T) {
	t.Setenv("LLAMACTL_BASE_URL", "http://localhost:9090")
	t.Setenv("LLAMACTL_MANAGEMENT_API_KEY", "test-key")
	t.Setenv("APP_JWT_SIGNING_KEY", "01234567890123456789012345678901")
	t.Setenv("APP_JWT_ACCESS_TTL", "20m")
	t.Setenv("APP_JWT_REFRESH_TTL", "240h")

	cfg, err := LoadFromEnv()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if cfg.Port != "8000" {
		t.Fatalf("expected default port 8000, got %s", cfg.Port)
	}
	if cfg.JWTAccessTTL != 20*time.Minute {
		t.Fatalf("expected access ttl 20m, got %s", cfg.JWTAccessTTL)
	}
	if cfg.StorageBackend != "inmemory" {
		t.Fatalf("expected default storage backend inmemory, got %q", cfg.StorageBackend)
	}
}

func TestLoadFromEnvMissingRequired(t *testing.T) {
	t.Setenv("LLAMACTL_BASE_URL", "")
	t.Setenv("LLAMACTL_MANAGEMENT_API_KEY", "")
	t.Setenv("APP_JWT_SIGNING_KEY", "")

	_, err := LoadFromEnv()
	if err == nil {
		t.Fatal("expected error for missing env vars")
	}
}

func TestLoadFromEnvReadsDotEnvFile(t *testing.T) {
	unsetForTest(t, "LLAMACTL_BASE_URL")
	unsetForTest(t, "LLAMACTL_MANAGEMENT_API_KEY")
	unsetForTest(t, "APP_JWT_SIGNING_KEY")

	tmpDir := t.TempDir()
	dotEnv := "LLAMACTL_BASE_URL=http://localhost:7000\n" +
		"LLAMACTL_MANAGEMENT_API_KEY=dotenv-key\n" +
		"APP_JWT_SIGNING_KEY=01234567890123456789012345678901\n"
	if err := os.WriteFile(filepath.Join(tmpDir, ".env"), []byte(dotEnv), 0o600); err != nil {
		t.Fatalf("failed to write .env file: %v", err)
	}

	originalWD, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get working directory: %v", err)
	}
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("failed to change working directory: %v", err)
	}
	t.Cleanup(func() {
		_ = os.Chdir(originalWD)
	})

	cfg, err := LoadFromEnv()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if cfg.LlamactlBaseURL != "http://localhost:7000" {
		t.Fatalf("expected LLAMACTL_BASE_URL from .env, got %s", cfg.LlamactlBaseURL)
	}
	if cfg.LlamactlManagementAPIKey != "dotenv-key" {
		t.Fatalf("expected LLAMACTL_MANAGEMENT_API_KEY from .env, got %s", cfg.LlamactlManagementAPIKey)
	}
}

func TestLoadFromEnvAndYAMLUsesYAMLWhenEnvUnset(t *testing.T) {
	unsetForTest(t, "PORT")
	unsetForTest(t, "HOST")
	unsetForTest(t, "LOG_LEVEL")
	unsetForTest(t, "HTTP_READ_TIMEOUT")
	unsetForTest(t, "HTTP_WRITE_TIMEOUT")
	unsetForTest(t, "HTTP_IDLE_TIMEOUT")
	unsetForTest(t, "HTTP_SHUTDOWN_TIMEOUT")
	unsetForTest(t, "APP_JWT_ACCESS_TTL")
	unsetForTest(t, "APP_JWT_REFRESH_TTL")
	unsetForTest(t, "APP_STORAGE_BACKEND")
	unsetForTest(t, "APP_STORAGE_SQLITE_PATH")

	t.Setenv("LLAMACTL_BASE_URL", "http://env-base")
	t.Setenv("LLAMACTL_MANAGEMENT_API_KEY", "test-key")
	t.Setenv("APP_JWT_SIGNING_KEY", "01234567890123456789012345678901")

	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "config.yaml")
	yaml := strings.Join([]string{
		"server:",
		"  host: 127.0.0.1",
		"  port: \"9100\"",
		"  readTimeOut: \"9s\"",
		"  writeTimeOut: \"11s\"",
		"  idleTimeOut: \"30s\"",
		"  shutdownTimeOut: \"7s\"",
		"security:",
		"  jwtAccessTTL: \"21m\"",
		"  jwtRefreshTTL: \"200h\"",
		"bootstrap:",
		"  adminUsername: root",
		"logging:",
		"  level: debug",
		"storage:",
		"  backend: sqlite",
		"  sqlite:",
		"    path: /tmp/llamactl-console.db",
	}, "\n")
	if err := os.WriteFile(configPath, []byte(yaml), 0o600); err != nil {
		t.Fatalf("failed to write config file: %v", err)
	}

	cfg, err := LoadFromEnvAndYAML(configPath)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if cfg.Host != "127.0.0.1" {
		t.Fatalf("expected host from YAML, got %q", cfg.Host)
	}
	if cfg.Port != "9100" {
		t.Fatalf("expected port from YAML, got %q", cfg.Port)
	}
	if cfg.ReadTimeout != 9*time.Second {
		t.Fatalf("expected read timeout 9s, got %s", cfg.ReadTimeout)
	}
	if cfg.JWTAccessTTL != 21*time.Minute {
		t.Fatalf("expected access ttl 21m, got %s", cfg.JWTAccessTTL)
	}
	if cfg.BootstrapAdminUsername != "root" {
		t.Fatalf("expected bootstrap username from YAML, got %q", cfg.BootstrapAdminUsername)
	}
	if cfg.StorageBackend != "sqlite" {
		t.Fatalf("expected storage backend from YAML, got %q", cfg.StorageBackend)
	}
	if cfg.StorageSQLitePath != "/tmp/llamactl-console.db" {
		t.Fatalf("expected sqlite path from YAML, got %q", cfg.StorageSQLitePath)
	}
}

func TestLoadFromEnvAndYAMLEnvOverridesYAML(t *testing.T) {
	t.Setenv("PORT", "9200")
	t.Setenv("LOG_LEVEL", "error")
	t.Setenv("LLAMACTL_BASE_URL", "http://env-base")
	t.Setenv("LLAMACTL_MANAGEMENT_API_KEY", "test-key")
	t.Setenv("APP_JWT_SIGNING_KEY", "01234567890123456789012345678901")
	t.Setenv("APP_STORAGE_BACKEND", "inmemory")

	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "config.yaml")
	yaml := strings.Join([]string{
		"server:",
		"  port: \"9100\"",
		"llamactl:",
		"  baseURL: http://yaml-base",
		"logging:",
		"  level: debug",
		"storage:",
		"  backend: sqlite",
		"  sqlite:",
		"    path: /tmp/yaml.db",
	}, "\n")
	if err := os.WriteFile(configPath, []byte(yaml), 0o600); err != nil {
		t.Fatalf("failed to write config file: %v", err)
	}

	cfg, err := LoadFromEnvAndYAML(configPath)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if cfg.Port != "9200" {
		t.Fatalf("expected env port to override YAML, got %q", cfg.Port)
	}
	if cfg.LlamactlBaseURL != "http://env-base" {
		t.Fatalf("expected env base URL to override YAML, got %q", cfg.LlamactlBaseURL)
	}
	if cfg.LogLevel != parseLogLevel("error") {
		t.Fatalf("expected env log level to override YAML")
	}
	if cfg.StorageBackend != "inmemory" {
		t.Fatalf("expected env storage backend to override YAML, got %q", cfg.StorageBackend)
	}
}

func TestLoadFromEnvRejectsUnsupportedStorageBackend(t *testing.T) {
	t.Setenv("LLAMACTL_BASE_URL", "http://localhost:9090")
	t.Setenv("LLAMACTL_MANAGEMENT_API_KEY", "test-key")
	t.Setenv("APP_JWT_SIGNING_KEY", "01234567890123456789012345678901")
	t.Setenv("APP_STORAGE_BACKEND", "postgres")

	_, err := LoadFromEnv()
	if err == nil {
		t.Fatal("expected an error for invalid storage backend")
	}
}

func TestLoadFromEnvUsesDefaultSQLitePath(t *testing.T) {
	t.Setenv("LLAMACTL_BASE_URL", "http://localhost:9090")
	t.Setenv("LLAMACTL_MANAGEMENT_API_KEY", "test-key")
	t.Setenv("APP_JWT_SIGNING_KEY", "01234567890123456789012345678901")
	t.Setenv("APP_STORAGE_BACKEND", "sqlite")
	t.Setenv("APP_STORAGE_SQLITE_PATH", "")

	cfg, err := LoadFromEnv()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if cfg.StorageSQLitePath != "data/llamactl-console.db" {
		t.Fatalf("expected default sqlite path, got %q", cfg.StorageSQLitePath)
	}
}

func TestLoadFromEnvAndYAMLRejectsSensitiveFields(t *testing.T) {
	t.Setenv("LLAMACTL_BASE_URL", "http://localhost:9090")
	t.Setenv("LLAMACTL_MANAGEMENT_API_KEY", "test-key")
	t.Setenv("APP_JWT_SIGNING_KEY", "01234567890123456789012345678901")

	cases := []struct {
		name string
		yaml string
	}{
		{
			name: "management api key",
			yaml: "llamactl:\n  managementAPIKey: secret\n",
		},
		{
			name: "bootstrap admin password",
			yaml: "bootstrap:\n  adminPassword: secret\n",
		},
		{
			name: "jwt signing key",
			yaml: "security:\n  jwtSigningKey: secret\n",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			tmpDir := t.TempDir()
			configPath := filepath.Join(tmpDir, "config.yaml")
			if err := os.WriteFile(configPath, []byte(tc.yaml), 0o600); err != nil {
				t.Fatalf("failed to write config file: %v", err)
			}

			_, err := LoadFromEnvAndYAML(configPath)
			if err == nil {
				t.Fatal("expected an error for sensitive YAML field")
			}
		})
	}
}

func unsetForTest(t *testing.T, name string) {
	t.Helper()

	originalValue, hadValue := os.LookupEnv(name)
	if err := os.Unsetenv(name); err != nil {
		t.Fatalf("failed to unset %s: %v", name, err)
	}

	t.Cleanup(func() {
		if !hadValue {
			_ = os.Unsetenv(name)
			return
		}

		_ = os.Setenv(name, originalValue)
	})
}
