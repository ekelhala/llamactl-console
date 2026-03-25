package main

import "testing"

func TestParseConfigPathDefault(t *testing.T) {
	t.Setenv(configPathEnvVar, "")

	options, err := parseServerOptions(nil)
	if err != nil {
		t.Fatalf("expected parseServerOptions to succeed, got error: %v", err)
	}

	if options.configPath != defaultConfigPath {
		t.Fatalf("expected default config path %s, got %q", defaultConfigPath, options.configPath)
	}
}

func TestParseConfigPathUsesEnvWhenFlagNotSet(t *testing.T) {
	t.Setenv(configPathEnvVar, "/tmp/env-config.yaml")

	options, err := parseServerOptions(nil)
	if err != nil {
		t.Fatalf("expected parseServerOptions to succeed, got error: %v", err)
	}

	if options.configPath != "/tmp/env-config.yaml" {
		t.Fatalf("expected APP_CONFIG_FILE to be used when flag is not set, got %q", options.configPath)
	}
}

func TestParseConfigPathFlagOverridesEnv(t *testing.T) {
	t.Setenv(configPathEnvVar, "/tmp/env-config.yaml")

	options, err := parseServerOptions([]string{"--config", "/tmp/flag-config.yaml"})
	if err != nil {
		t.Fatalf("expected parseServerOptions to succeed, got error: %v", err)
	}

	if options.configPath != "/tmp/flag-config.yaml" {
		t.Fatalf("expected --config to override APP_CONFIG_FILE, got %q", options.configPath)
	}
}

func TestParseServerOptionsInvalidFlagReturnsError(t *testing.T) {
	_, err := parseServerOptions([]string{"--unknown-flag"})
	if err == nil {
		t.Fatal("expected parseServerOptions to return error for unknown flag")
	}
}
