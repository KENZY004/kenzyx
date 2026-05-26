package main

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	dbURL := os.Getenv("DATABASE_URL")
	pool, _ := pgxpool.New(context.Background(), dbURL)
	defer pool.Close()

	username := "kenz"

	_, err := pool.Exec(context.Background(), "UPDATE users SET role = 'admin', is_verified = true WHERE username = $1", username)
	if err != nil {
		fmt.Printf("Promotion failed: %v\n", err)
	} else {
		fmt.Printf("✅ User %s promoted to ADMIN successfully.\n", username)
	}
}
