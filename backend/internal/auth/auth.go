package auth

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"kenyx/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Service struct {
	secret []byte
}

type Claims struct {
	UserID   string     `json:"user_id"`
	Username string     `json:"username"`
	Role     models.Role `json:"role"`
	jwt.RegisteredClaims
}

func NewService(secret string) *Service {
	return &Service{secret: []byte(secret)}
}

// GenerateToken creates a JWT for a user.
func (s *Service) GenerateToken(user *models.User) (string, int64, error) {
	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	claims := Claims{
		UserID:   user.ID,
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "kenyx",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.secret)
	return signed, expiresAt.Unix(), err
}

// ParseToken validates and extracts claims from a JWT.
func (s *Service) ParseToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.secret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

// Middleware is a Gin middleware that enforces JWT auth.
func (s *Service) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			return
		}
		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization format"})
			return
		}
		claims, err := s.ParseToken(parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", string(claims.Role))
		c.Next()
	}
}

// OptionalMiddleware attempts to parse JWT but doesn't abort if missing.
func (s *Service) OptionalMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.Next()
			return
		}
		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			c.Next()
			return
		}
		
		claims, err := s.ParseToken(parts[1])
		if err == nil {
			c.Set("user_id", claims.UserID)
			c.Set("username", claims.Username)
			c.Set("role", string(claims.Role))
		}
		c.Next()
	}
}

// RequireAdmin is a Gin middleware that enforces admin role.
func (s *Service) RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		if role != string(models.RoleAdmin) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "admin access required"})
			return
		}
		c.Next()
	}
}

// Helpers to get values from context
func GetUserID(c *gin.Context) string {
	id, _ := c.Get("user_id")
	if s, ok := id.(string); ok {
		return s
	}
	return ""
}

// GetUsername extracts the username from gin context.
func GetUsername(c *gin.Context) string {
	name, _ := c.Get("username")
	if s, ok := name.(string); ok {
		return s
	}
	return ""
}

// IsAdmin checks if the current user has the admin role.
func IsAdmin(c *gin.Context) bool {
	role, _ := c.Get("role")
	return role == string(models.RoleAdmin)
}
