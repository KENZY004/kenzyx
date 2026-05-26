package auth

import (
	"context"
	"errors"
	"os"

	"google.golang.org/api/idtoken"
)

// GoogleUser represents the data returned from Google's ID token
type GoogleUser struct {
	Email    string `json:"email"`
	Name     string `json:"name"`
	Picture  string `json:"picture"`
	Subject  string `json:"sub"` // Unique Google ID
}

// VerifyGoogleToken verifies a Google ID token and returns the user's info.
func VerifyGoogleToken(ctx context.Context, idToken string) (*GoogleUser, error) {
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	if clientID == "" {
		// In development, we might want to allow this if a specific flag is set,
		// but for security, we should require it.
		return nil, errors.New("GOOGLE_CLIENT_ID not set in backend")
	}

	payload, err := idtoken.Validate(ctx, idToken, clientID)
	if err != nil {
		return nil, err
	}

	// Extract claims
	user := &GoogleUser{
		Email:   payload.Claims["email"].(string),
		Subject: payload.Subject,
	}

	if name, ok := payload.Claims["name"].(string); ok {
		user.Name = name
	}
	if picture, ok := payload.Claims["picture"].(string); ok {
		user.Picture = picture
	}

	return user, nil
}
