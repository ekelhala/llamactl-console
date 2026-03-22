package handlers

import (
	"encoding/json"
	"net/http"
	"time"
)

type HealthHandler struct {
	startedAt time.Time
}

func NewHealthHandler(startedAt time.Time) *HealthHandler {
	return &HealthHandler{startedAt: startedAt}
}

func (h *HealthHandler) Health(w http.ResponseWriter, _ *http.Request) {
	h.respond(w, http.StatusOK, map[string]any{
		"status":         "ok",
		"uptime_seconds": int(time.Since(h.startedAt).Seconds()),
	})
}

func (h *HealthHandler) Liveness(w http.ResponseWriter, _ *http.Request) {
	h.respond(w, http.StatusOK, map[string]any{"status": "alive"})
}

func (h *HealthHandler) Readiness(w http.ResponseWriter, _ *http.Request) {
	h.respond(w, http.StatusOK, map[string]any{"status": "ready"})
}

func (h *HealthHandler) respond(w http.ResponseWriter, status int, body map[string]any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
