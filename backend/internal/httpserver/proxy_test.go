package httpserver

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/ekelhala/llamactl-console/backend/internal/config"
)

func TestNewUpstreamProxyForwardsPathAndQuery(t *testing.T) {
	const apiKey = "proxy-api-key"

	var gotPath string
	var gotQuery string
	var gotMethod string
	var gotAuthorization string

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotQuery = r.URL.RawQuery
		gotMethod = r.Method
		gotAuthorization = r.Header.Get("Authorization")
		w.WriteHeader(http.StatusAccepted)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer upstream.Close()

	cfg := config.Config{
		LlamactlBaseURL:          upstream.URL,
		LlamactlManagementAPIKey: apiKey,
		StartedAt:                time.Now(),
	}

	proxy := NewUpstreamProxy(cfg, slog.New(slog.NewTextHandler(io.Discard, nil)))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/instances/demo/start?tail=10&follow=true", nil)
	req.Header.Set("Authorization", "Bearer user-access-token")
	rec := httptest.NewRecorder()

	proxy.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected status %d, got %d", http.StatusAccepted, rec.Code)
	}
	if gotMethod != http.MethodPost {
		t.Fatalf("expected method %s, got %s", http.MethodPost, gotMethod)
	}
	if gotPath != "/api/v1/instances/demo/start" {
		t.Fatalf("expected path to remain unchanged, got %s", gotPath)
	}
	if gotQuery != "tail=10&follow=true" {
		t.Fatalf("expected query to remain unchanged, got %s", gotQuery)
	}
	if gotAuthorization != "Bearer "+apiKey {
		t.Fatalf("expected Authorization header %q, got %q", "Bearer "+apiKey, gotAuthorization)
	}
}
