package auth

import (
	"testing"
	"time"
)

func TestBootstrapLoginAndRefresh(t *testing.T) {
	users := NewInMemoryUserStore()
	refresh := NewInMemoryRefreshStore()

	svc, err := NewService("01234567890123456789012345678901", 15*time.Minute, 24*time.Hour, users, refresh)
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	generatedPassword, created, err := svc.BootstrapAdmin("admin", "")
	if err != nil {
		t.Fatalf("bootstrap admin: %v", err)
	}
	if !created {
		t.Fatal("expected bootstrap user to be created")
	}
	if generatedPassword == "" {
		t.Fatal("expected generated bootstrap password")
	}

	user, tokens, err := svc.Login("admin", generatedPassword)
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	if user.Username != "admin" {
		t.Fatalf("expected username admin, got %q", user.Username)
	}
	if tokens.AccessToken == "" || tokens.RefreshToken == "" {
		t.Fatal("expected both access and refresh tokens")
	}

	verified, err := svc.VerifyAccessToken(tokens.AccessToken)
	if err != nil {
		t.Fatalf("verify access token: %v", err)
	}
	if verified.ID != user.ID {
		t.Fatalf("expected verified user id %q, got %q", user.ID, verified.ID)
	}

	_, rotated, err := svc.Refresh(tokens.RefreshToken)
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}
	if rotated.RefreshToken == tokens.RefreshToken {
		t.Fatal("expected refresh token rotation")
	}

	_, _, err = svc.Refresh(tokens.RefreshToken)
	if err == nil {
		t.Fatal("expected old refresh token to be invalid after rotation")
	}
}

func TestBootstrapWithPredefinedPasswordDisablesMustRotate(t *testing.T) {
	users := NewInMemoryUserStore()
	refresh := NewInMemoryRefreshStore()

	svc, err := NewService("01234567890123456789012345678901", 15*time.Minute, 24*time.Hour, users, refresh)
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	generated, created, err := svc.BootstrapAdmin("admin", "my-static-bootstrap-pass")
	if err != nil {
		t.Fatalf("bootstrap admin: %v", err)
	}
	if !created {
		t.Fatal("expected bootstrap user to be created")
	}
	if generated != "" {
		t.Fatal("expected no generated password when predefined password is configured")
	}

	user, _, err := svc.Login("admin", "my-static-bootstrap-pass")
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	if user.MustRotatePassword {
		t.Fatal("expected must_rotate_password to be false for predefined password")
	}
}
