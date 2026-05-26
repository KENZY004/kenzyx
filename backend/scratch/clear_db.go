package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL not set")
	}

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	// Clear users table (this will cascade if set up, or fail if there are dependencies)
	// We'll use TRUNCATE for speed and thoroughness
	fmt.Println("🧹 Clearing users table...")
	_, err = pool.Exec(context.Background(), "TRUNCATE TABLE users CASCADE")
	if err != nil {
		log.Fatalf("Failed to clear users table: %v", err)
	}

	fmt.Println("✅ All users data removed successfully.")
}
