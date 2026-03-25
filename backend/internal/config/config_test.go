package config

import (
	"os"
	"path/filepath"
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
