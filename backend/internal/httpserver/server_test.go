package httpserver

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/ekelhala/llamactl-console/backend/internal/auth"
	"github.com/ekelhala/llamactl-console/backend/internal/config"
)

func TestNewAuthStoresInMemory(t *testing.T) {
	storesCfg := config.Config{StorageBackend: "inmemory"}

	userStore, refreshStore, err := newAuthStores(storesCfg)
	if err != nil {
		t.Fatalf("new auth stores: %v", err)
	}
	if _, ok := userStore.(*auth.InMemoryUserStore); !ok {
		t.Fatalf("expected *auth.InMemoryUserStore, got %T", userStore)
	}
	if _, ok := refreshStore.(*auth.InMemoryRefreshStore); !ok {
		t.Fatalf("expected *auth.InMemoryRefreshStore, got %T", refreshStore)
	}
}

func TestNewAuthStoresSQLiteCreatesDatabaseFile(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "state", "llamactl.db")
	storesCfg := config.Config{
		StorageBackend:    "sqlite",
		StorageSQLitePath: dbPath,
	}

	userStore, refreshStore, err := newAuthStores(storesCfg)
	if err != nil {
		t.Fatalf("new auth stores: %v", err)
	}
	if userStore == nil || refreshStore == nil {
		t.Fatal("expected non-nil stores")
	}
	if _, err := os.Stat(dbPath); err != nil {
		t.Fatalf("expected sqlite database file to exist: %v", err)
	}
}
