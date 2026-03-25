package main

import "testing"

func TestParseConfigPathDefault(t *testing.T) {
	t.Setenv("APP_CONFIG_FILE", "")

	got := parseConfigPath(nil)

	if got != "config.yaml" {
		t.Fatalf("expected default config path config.yaml, got %q", got)
	}
}

func TestParseConfigPathUsesEnvWhenFlagNotSet(t *testing.T) {
	t.Setenv("APP_CONFIG_FILE", "/tmp/env-config.yaml")

	got := parseConfigPath(nil)

	if got != "/tmp/env-config.yaml" {
		t.Fatalf("expected APP_CONFIG_FILE to be used when flag is not set, got %q", got)
	}
}

func TestParseConfigPathFlagOverridesEnv(t *testing.T) {
	t.Setenv("APP_CONFIG_FILE", "/tmp/env-config.yaml")

	got := parseConfigPath([]string{"--config", "/tmp/flag-config.yaml"})

	if got != "/tmp/flag-config.yaml" {
		t.Fatalf("expected --config to override APP_CONFIG_FILE, got %q", got)
	}
}
