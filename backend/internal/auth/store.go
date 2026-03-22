package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"sync"
	"time"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrUserAlreadyExists = errors.New("user already exists")
)

type User struct {
	ID                 string
	Username           string
	PasswordHash       string
	Role               string
	MustRotatePassword bool
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

type RefreshSession struct {
	TokenHash string
	UserID    string
	ExpiresAt time.Time
}

type UserStore interface {
	Count() int
	Create(user User) error
	GetByUsername(username string) (User, error)
	GetByID(id string) (User, error)
}

type RefreshStore interface {
	Save(session RefreshSession)
	GetByHash(token string) (RefreshSession, bool)
	DeleteByHash(token string)
}

type InMemoryUserStore struct {
	mu         sync.RWMutex
	byID       map[string]User
	byUsername map[string]string
}

func NewInMemoryUserStore() *InMemoryUserStore {
	return &InMemoryUserStore{
		byID:       make(map[string]User),
		byUsername: make(map[string]string),
	}
}

func (s *InMemoryUserStore) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.byID)
}

func (s *InMemoryUserStore) Create(user User) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.byUsername[user.Username]; exists {
		return ErrUserAlreadyExists
	}

	s.byID[user.ID] = user
	s.byUsername[user.Username] = user.ID
	return nil
}

func (s *InMemoryUserStore) GetByUsername(username string) (User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	userID, ok := s.byUsername[username]
	if !ok {
		return User{}, ErrUserNotFound
	}

	user, ok := s.byID[userID]
	if !ok {
		return User{}, ErrUserNotFound
	}

	return user, nil
}

func (s *InMemoryUserStore) GetByID(id string) (User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	user, ok := s.byID[id]
	if !ok {
		return User{}, ErrUserNotFound
	}

	return user, nil
}

type InMemoryRefreshStore struct {
	mu    sync.RWMutex
	items map[string]RefreshSession
}

func NewInMemoryRefreshStore() *InMemoryRefreshStore {
	return &InMemoryRefreshStore{items: make(map[string]RefreshSession)}
}

func (s *InMemoryRefreshStore) Save(session RefreshSession) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.items[session.TokenHash] = session
}

func (s *InMemoryRefreshStore) GetByHash(token string) (RefreshSession, bool) {
	hash := hashToken(token)

	s.mu.RLock()
	defer s.mu.RUnlock()
	item, ok := s.items[hash]
	return item, ok
}

func (s *InMemoryRefreshStore) DeleteByHash(token string) {
	hash := hashToken(token)

	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.items, hash)
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
