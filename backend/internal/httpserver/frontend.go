package httpserver

import (
	"embed"
	"io/fs"
	"log/slog"
	"net/http"
	"path"
	"strings"
)

//go:embed all:web/dist
var frontendBundle embed.FS

func NewFrontendHandler(logger *slog.Logger) http.Handler {
	distFS, err := fs.Sub(frontendBundle, "web/dist")
	if err != nil {
		logger.Error("failed to access embedded frontend bundle", "error", err)
		return http.NotFoundHandler()
	}

	fileServer := http.FileServer(http.FS(distFS))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestedPath := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")

		if requestedPath == "" {
			serveIndexHTML(w, r, distFS)
			return
		}

		if _, err := fs.Stat(distFS, requestedPath); err == nil {
			fileServer.ServeHTTP(w, r)
			return
		}

		if path.Ext(requestedPath) != "" {
			http.NotFound(w, r)
			return
		}

		serveIndexHTML(w, r, distFS)
	})
}

func serveIndexHTML(w http.ResponseWriter, r *http.Request, distFS fs.FS) {
	indexContent, err := fs.ReadFile(distFS, "index.html")
	if err != nil {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write(indexContent)
}
