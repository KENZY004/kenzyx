package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

// GenerateSecureToken creates a cryptographically secure random 32-character hex string.
func GenerateSecureToken() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// HashToken returns the SHA-256 hash of a raw token for secure DB storage.
func HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// FormatVerificationLink creates the full URL for the user to click.
func FormatVerificationLink(baseURL, token string) string {
	return fmt.Sprintf("%s/verify?token=%s", baseURL, token)
}
