package auth

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

type SQLiteUserStore struct {
	db *sql.DB
}

type SQLiteRefreshStore struct {
	db *sql.DB
}

func NewSQLiteStores(databasePath string) (*SQLiteUserStore, *SQLiteRefreshStore, error) {
	path := filepath.Clean(databasePath)
	if path == "" || path == "." {
		return nil, nil, errors.New("sqlite database path is required")
	}

	if err := ensureDatabaseFile(path); err != nil {
		return nil, nil, fmt.Errorf("prepare sqlite database: %w", err)
	}

	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, nil, fmt.Errorf("open sqlite database: %w", err)
	}

	if _, err := db.Exec(`PRAGMA foreign_keys = ON`); err != nil {
		_ = db.Close()
		return nil, nil, fmt.Errorf("enable sqlite foreign keys: %w", err)
	}
	if err := createSchema(db); err != nil {
		_ = db.Close()
		return nil, nil, fmt.Errorf("create sqlite schema: %w", err)
	}

	return &SQLiteUserStore{db: db}, &SQLiteRefreshStore{db: db}, nil
}

func (s *SQLiteUserStore) Count() int {
	var count int
	if err := s.db.QueryRow(`SELECT COUNT(1) FROM users`).Scan(&count); err != nil {
		return 0
	}
	return count
}

func (s *SQLiteUserStore) Create(user User) error {
	_, err := s.db.Exec(
		`INSERT INTO users (id, username, password_hash, role, must_rotate_password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		user.ID,
		user.Username,
		user.PasswordHash,
		user.Role,
		boolToInt(user.MustRotatePassword),
		user.CreatedAt.UTC().Format(time.RFC3339Nano),
		user.UpdatedAt.UTC().Format(time.RFC3339Nano),
	)
	if err != nil {
		if isSQLiteConstraintError(err) {
			return ErrUserAlreadyExists
		}
		return err
	}
	return nil
}

func (s *SQLiteUserStore) GetByUsername(username string) (User, error) {
	return s.getOne(`SELECT id, username, password_hash, role, must_rotate_password, created_at, updated_at FROM users WHERE username = ?`, username)
}

func (s *SQLiteUserStore) GetByID(id string) (User, error) {
	return s.getOne(`SELECT id, username, password_hash, role, must_rotate_password, created_at, updated_at FROM users WHERE id = ?`, id)
}

func (s *SQLiteUserStore) getOne(query string, arg string) (User, error) {
	var user User
	var mustRotate int
	var createdAt, updatedAt string
	err := s.db.QueryRow(query, arg).Scan(
		&user.ID,
		&user.Username,
		&user.PasswordHash,
		&user.Role,
		&mustRotate,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return User{}, ErrUserNotFound
		}
		return User{}, err
	}

	created, err := time.Parse(time.RFC3339Nano, createdAt)
	if err != nil {
		return User{}, err
	}
	updated, err := time.Parse(time.RFC3339Nano, updatedAt)
	if err != nil {
		return User{}, err
	}

	user.MustRotatePassword = mustRotate == 1
	user.CreatedAt = created
	user.UpdatedAt = updated
	return user, nil
}

func (s *SQLiteRefreshStore) Save(session RefreshSession) {
	_, _ = s.db.Exec(
		`INSERT INTO refresh_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)
		ON CONFLICT(token_hash) DO UPDATE SET user_id = excluded.user_id, expires_at = excluded.expires_at`,
		session.TokenHash,
		session.UserID,
		session.ExpiresAt.UTC().Format(time.RFC3339Nano),
	)
}

func (s *SQLiteRefreshStore) GetByHash(token string) (RefreshSession, bool) {
	hash := hashToken(token)
	var session RefreshSession
	var expiresAt string
	err := s.db.QueryRow(
		`SELECT token_hash, user_id, expires_at FROM refresh_sessions WHERE token_hash = ?`,
		hash,
	).Scan(&session.TokenHash, &session.UserID, &expiresAt)
	if err != nil {
		return RefreshSession{}, false
	}

	expires, err := time.Parse(time.RFC3339Nano, expiresAt)
	if err != nil {
		return RefreshSession{}, false
	}
	session.ExpiresAt = expires
	return session, true
}

func (s *SQLiteRefreshStore) DeleteByHash(token string) {
	hash := hashToken(token)
	_, _ = s.db.Exec(`DELETE FROM refresh_sessions WHERE token_hash = ?`, hash)
}

func ensureDatabaseFile(path string) error {
	dir := filepath.Dir(path)
	if dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}

	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		file, createErr := os.OpenFile(path, os.O_RDWR|os.O_CREATE, 0o600)
		if createErr != nil {
			return createErr
		}
		return file.Close()
	} else if err != nil {
		return err
	}

	return nil
}

func createSchema(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			username TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL,
			must_rotate_password INTEGER NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS refresh_sessions (
			token_hash TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			expires_at TEXT NOT NULL,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		);
	`)
	return err
}

func isSQLiteConstraintError(err error) bool {
	return err != nil && (strings.Contains(err.Error(), "UNIQUE constraint failed") || strings.Contains(err.Error(), "constraint failed"))
}

func boolToInt(value bool) int {
	if value {
		return 1
	}
	return 0
}
