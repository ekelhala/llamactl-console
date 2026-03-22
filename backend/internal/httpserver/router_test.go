package httpserver

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/ekelhala/llamactl-console/backend/internal/auth"
	"github.com/ekelhala/llamactl-console/backend/internal/handlers"
)

func TestProtectedProxyRequiresAccessToken(t *testing.T) {
	authHandler := testAuthHandler(t)
	health := handlers.NewHealthHandler(time.Now())

	proxyCalled := false
	proxy := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		proxyCalled = true
		w.WriteHeader(http.StatusOK)
	})

	router := NewRouter(health, authHandler, proxy)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/instances", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected unauthorized, got %d", rec.Code)
	}
	if proxyCalled {
		t.Fatal("proxy should not be called without access token")
	}
}

func TestLoginThenCallProtectedProxy(t *testing.T) {
	authHandler := testAuthHandler(t)
	health := handlers.NewHealthHandler(time.Now())

	proxyCalled := false
	proxy := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		proxyCalled = true
		w.WriteHeader(http.StatusAccepted)
	})

	router := NewRouter(health, authHandler, proxy)

	loginBody := map[string]string{
		"username": "admin",
		"password": "bootstrap-pass",
	}
	body, _ := json.Marshal(loginBody)

	loginReq := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	loginRec := httptest.NewRecorder()
	router.ServeHTTP(loginRec, loginReq)
	if loginRec.Code != http.StatusOK {
		t.Fatalf("expected login status 200, got %d", loginRec.Code)
	}

	var loginResp struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(loginRec.Body).Decode(&loginResp); err != nil {
		t.Fatalf("decode login response: %v", err)
	}
	if loginResp.AccessToken == "" {
		t.Fatal("expected access token in login response")
	}

	protectedReq := httptest.NewRequest(http.MethodGet, "/api/v1/instances", nil)
	protectedReq.Header.Set("Authorization", "Bearer "+loginResp.AccessToken)
	protectedRec := httptest.NewRecorder()
	router.ServeHTTP(protectedRec, protectedReq)

	if protectedRec.Code != http.StatusAccepted {
		t.Fatalf("expected protected endpoint status 202, got %d", protectedRec.Code)
	}
	if !proxyCalled {
		t.Fatal("expected proxy to be called with valid access token")
	}
}

func testAuthHandler(t *testing.T) *auth.HTTPHandler {
	t.Helper()

	users := auth.NewInMemoryUserStore()
	refresh := auth.NewInMemoryRefreshStore()
	svc, err := auth.NewService("01234567890123456789012345678901", 15*time.Minute, 24*time.Hour, users, refresh)
	if err != nil {
		t.Fatalf("new auth service: %v", err)
	}

	_, created, err := svc.BootstrapAdmin("admin", "bootstrap-pass")
	if err != nil {
		t.Fatalf("bootstrap admin: %v", err)
	}
	if !created {
		t.Fatal("expected bootstrap user creation")
	}

	return auth.NewHTTPHandler(svc)
}
