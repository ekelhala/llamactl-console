package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

type contextKey string

const authUserContextKey contextKey = "auth_user"

type HTTPHandler struct {
	service *Service
}

func NewHTTPHandler(service *Service) *HTTPHandler {
	return &HTTPHandler{service: service}
}

func (h *HTTPHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, tokens, err := h.service.Login(req.Username, req.Password)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"access_token":  tokens.AccessToken,
		"refresh_token": tokens.RefreshToken,
		"token_type":    tokens.TokenType,
		"expires_in":    tokens.ExpiresInSec,
		"user":          user,
	})
}

func (h *HTTPHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, tokens, err := h.service.Refresh(req.RefreshToken)
	if err != nil {
		switch {
		case errors.Is(err, ErrExpiredToken):
			respondError(w, http.StatusUnauthorized, "refresh token expired")
		case errors.Is(err, ErrTokenNotFound):
			respondError(w, http.StatusUnauthorized, "refresh token revoked")
		default:
			respondError(w, http.StatusUnauthorized, "invalid refresh token")
		}
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"access_token":  tokens.AccessToken,
		"refresh_token": tokens.RefreshToken,
		"token_type":    tokens.TokenType,
		"expires_in":    tokens.ExpiresInSec,
		"user":          user,
	})
}

func (h *HTTPHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err == nil && strings.TrimSpace(req.RefreshToken) != "" {
		h.service.Logout(req.RefreshToken)
	}

	respondJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

func (h *HTTPHandler) Me(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"user": user})
}

func (h *HTTPHandler) RequireAccessToken(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := bearerToken(r.Header.Get("Authorization"))
		if token == "" {
			respondError(w, http.StatusUnauthorized, "missing bearer token")
			return
		}

		user, err := h.service.VerifyAccessToken(token)
		if err != nil {
			respondError(w, http.StatusUnauthorized, "invalid access token")
			return
		}

		ctx := context.WithValue(r.Context(), authUserContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func UserFromContext(ctx context.Context) (AuthenticatedUser, bool) {
	user, ok := ctx.Value(authUserContextKey).(AuthenticatedUser)
	return user, ok
}

func bearerToken(authorization string) string {
	parts := strings.Fields(strings.TrimSpace(authorization))
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		return ""
	}
	return parts[1]
}

func respondJSON(w http.ResponseWriter, statusCode int, body map[string]any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(body)
}

func respondError(w http.ResponseWriter, statusCode int, message string) {
	respondJSON(w, statusCode, map[string]any{"error": message})
}
