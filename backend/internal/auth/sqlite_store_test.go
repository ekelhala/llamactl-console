package auth

import (
	"path/filepath"
	"testing"
	"time"
)

func TestSQLiteStoresCreateDatabaseAndPersistRecords(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "nested", "auth.db")

	users, refresh, err := NewSQLiteStores(dbPath)
	if err != nil {
		t.Fatalf("new sqlite stores: %v", err)
	}

	now := time.Now().UTC().Truncate(time.Second)
	user := User{
		ID:                 "user-1",
		Username:           "admin",
		PasswordHash:       "hash",
		Role:               "admin",
		MustRotatePassword: true,
		CreatedAt:          now,
		UpdatedAt:          now,
	}
	if err := users.Create(user); err != nil {
		t.Fatalf("create user: %v", err)
	}

	gotUser, err := users.GetByUsername("admin")
	if err != nil {
		t.Fatalf("get user by username: %v", err)
	}
	if gotUser.ID != user.ID {
		t.Fatalf("expected id %q, got %q", user.ID, gotUser.ID)
	}
	if !gotUser.MustRotatePassword {
		t.Fatal("expected must rotate password to be true")
	}

	if users.Count() != 1 {
		t.Fatalf("expected count=1, got %d", users.Count())
	}

	token := "refresh-token-value"
	refresh.Save(RefreshSession{
		TokenHash: hashToken(token),
		UserID:    user.ID,
		ExpiresAt: now.Add(time.Hour),
	})

	session, ok := refresh.GetByHash(token)
	if !ok {
		t.Fatal("expected refresh session to exist")
	}
	if session.UserID != user.ID {
		t.Fatalf("expected refresh session user id %q, got %q", user.ID, session.UserID)
	}

	refresh.DeleteByHash(token)
	if _, ok := refresh.GetByHash(token); ok {
		t.Fatal("expected refresh session to be deleted")
	}
}

func TestSQLiteUserStoreCreateDuplicateUsername(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "auth.db")
	users, _, err := NewSQLiteStores(dbPath)
	if err != nil {
		t.Fatalf("new sqlite stores: %v", err)
	}

	now := time.Now()
	first := User{
		ID:           "user-1",
		Username:     "admin",
		PasswordHash: "hash-1",
		Role:         "admin",
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	second := User{
		ID:           "user-2",
		Username:     "admin",
		PasswordHash: "hash-2",
		Role:         "admin",
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := users.Create(first); err != nil {
		t.Fatalf("create first user: %v", err)
	}

	err = users.Create(second)
	if err != ErrUserAlreadyExists {
		t.Fatalf("expected ErrUserAlreadyExists, got %v", err)
	}
}
