package httpserver

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/ekelhala/llamactl-console/backend/internal/config"
)

func NewUpstreamProxy(cfg config.Config, logger *slog.Logger) http.Handler {
	target, err := url.Parse(cfg.LlamactlBaseURL)
	if err != nil {
		logger.Error("invalid upstream base url", "base_url", cfg.LlamactlBaseURL, "error", err)
		return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			respondJSON(w, http.StatusInternalServerError, map[string]any{
				"error": "invalid upstream base url configuration",
			})
		})
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	originalDirector := proxy.Director

	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.Host = target.Host
		req.Header.Set("ApiKeyAuth", cfg.LlamactlManagementAPIKey)
	}

	proxy.ErrorHandler = func(w http.ResponseWriter, _ *http.Request, err error) {
		logger.Error("upstream proxy request failed", "error", err)
		respondJSON(w, http.StatusBadGateway, map[string]any{
			"error": "upstream request failed",
		})
	}

	return proxy
}

func respondJSON(w http.ResponseWriter, statusCode int, body map[string]any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(body)
}
