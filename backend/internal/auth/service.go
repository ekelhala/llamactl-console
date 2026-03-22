package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidToken       = errors.New("invalid token")
	ErrExpiredToken       = errors.New("expired token")
	ErrTokenNotFound      = errors.New("refresh token not found")
)

type Service struct {
	signingKey []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
	users      UserStore
	refresh    RefreshStore
	now        func() time.Time
}

type Tokens struct {
	AccessToken  string
	RefreshToken string
	TokenType    string
	ExpiresInSec int64
}

type AuthenticatedUser struct {
	ID                 string `json:"id"`
	Username           string `json:"username"`
	Role               string `json:"role"`
	MustRotatePassword bool   `json:"must_rotate_password"`
}

type Claims struct {
	Username string `json:"username"`
	Role     string `json:"role"`
	Type     string `json:"type"`
	jwt.RegisteredClaims
}

func NewService(signingKey string, accessTTL, refreshTTL time.Duration, users UserStore, refresh RefreshStore) (*Service, error) {
	trimmed := strings.TrimSpace(signingKey)
	if len(trimmed) < 32 {
		return nil, errors.New("APP_JWT_SIGNING_KEY must be at least 32 characters")
	}

	if accessTTL <= 0 {
		return nil, errors.New("access ttl must be greater than zero")
	}
	if refreshTTL <= 0 {
		return nil, errors.New("refresh ttl must be greater than zero")
	}

	return &Service{
		signingKey: []byte(trimmed),
		accessTTL:  accessTTL,
		refreshTTL: refreshTTL,
		users:      users,
		refresh:    refresh,
		now:        time.Now,
	}, nil
}

func (s *Service) BootstrapAdmin(username, predefinedPassword string) (generatedPassword string, created bool, err error) {
	if s.users.Count() > 0 {
		return "", false, nil
	}

	password := strings.TrimSpace(predefinedPassword)
	mustRotate := false
	if password == "" {
		password, err = generateBootstrapPassword()
		if err != nil {
			return "", false, fmt.Errorf("generate bootstrap password: %w", err)
		}
		mustRotate = true
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", false, fmt.Errorf("hash bootstrap password: %w", err)
	}

	now := s.now()
	user := User{
		ID:                 uuid.NewString(),
		Username:           strings.TrimSpace(username),
		PasswordHash:       string(hash),
		Role:               "admin",
		MustRotatePassword: mustRotate,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	if user.Username == "" {
		user.Username = "admin"
	}

	if err := s.users.Create(user); err != nil {
		return "", false, fmt.Errorf("create bootstrap admin: %w", err)
	}

	if mustRotate {
		return password, true, nil
	}

	return "", true, nil
}

func (s *Service) Login(username, password string) (AuthenticatedUser, Tokens, error) {
	user, err := s.users.GetByUsername(strings.TrimSpace(username))
	if err != nil {
		return AuthenticatedUser{}, Tokens{}, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return AuthenticatedUser{}, Tokens{}, ErrInvalidCredentials
	}

	tokens, err := s.issueTokenPair(user)
	if err != nil {
		return AuthenticatedUser{}, Tokens{}, err
	}

	return userToAuthUser(user), tokens, nil
}

func (s *Service) Refresh(refreshToken string) (AuthenticatedUser, Tokens, error) {
	claims, err := s.parseAndValidate(refreshToken, "refresh")
	if err != nil {
		return AuthenticatedUser{}, Tokens{}, err
	}

	session, ok := s.refresh.GetByHash(refreshToken)
	if !ok {
		return AuthenticatedUser{}, Tokens{}, ErrTokenNotFound
	}

	if session.ExpiresAt.Before(s.now()) || session.UserID != claims.Subject {
		s.refresh.DeleteByHash(refreshToken)
		return AuthenticatedUser{}, Tokens{}, ErrExpiredToken
	}

	s.refresh.DeleteByHash(refreshToken)

	user, err := s.users.GetByID(claims.Subject)
	if err != nil {
		return AuthenticatedUser{}, Tokens{}, ErrInvalidToken
	}

	tokens, err := s.issueTokenPair(user)
	if err != nil {
		return AuthenticatedUser{}, Tokens{}, err
	}

	return userToAuthUser(user), tokens, nil
}

func (s *Service) Logout(refreshToken string) {
	s.refresh.DeleteByHash(refreshToken)
}

func (s *Service) VerifyAccessToken(accessToken string) (AuthenticatedUser, error) {
	claims, err := s.parseAndValidate(accessToken, "access")
	if err != nil {
		return AuthenticatedUser{}, err
	}

	return AuthenticatedUser{
		ID:       claims.Subject,
		Username: claims.Username,
		Role:     claims.Role,
	}, nil
}

func (s *Service) issueTokenPair(user User) (Tokens, error) {
	now := s.now()
	accessExpires := now.Add(s.accessTTL)
	refreshExpires := now.Add(s.refreshTTL)

	accessClaims := Claims{
		Username: user.Username,
		Role:     user.Role,
		Type:     "access",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(accessExpires),
			ID:        uuid.NewString(),
		},
	}
	refreshClaims := Claims{
		Username: user.Username,
		Role:     user.Role,
		Type:     "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(refreshExpires),
			ID:        uuid.NewString(),
		},
	}

	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString(s.signingKey)
	if err != nil {
		return Tokens{}, fmt.Errorf("sign access token: %w", err)
	}
	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString(s.signingKey)
	if err != nil {
		return Tokens{}, fmt.Errorf("sign refresh token: %w", err)
	}

	s.refresh.Save(RefreshSession{
		TokenHash: hashToken(refreshToken),
		UserID:    user.ID,
		ExpiresAt: refreshExpires,
	})

	return Tokens{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresInSec: int64(s.accessTTL.Seconds()),
	}, nil
}

func (s *Service) parseAndValidate(tokenStr, expectedType string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return s.signingKey, nil
	})
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}
	if !token.Valid {
		return nil, ErrInvalidToken
	}
	if claims.Type != expectedType {
		return nil, ErrInvalidToken
	}
	if claims.Subject == "" {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

func userToAuthUser(user User) AuthenticatedUser {
	return AuthenticatedUser{
		ID:                 user.ID,
		Username:           user.Username,
		Role:               user.Role,
		MustRotatePassword: user.MustRotatePassword,
	}
}

func generateBootstrapPassword() (string, error) {
	buf := make([]byte, 18)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}
