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

	content, err := os.ReadFile("db/seed.sql")
	if err != nil {
		fmt.Printf("Failed to read seed file: %v\n", err)
		return
	}

	_, err = pool.Exec(context.Background(), string(content))
	if err != nil {
		fmt.Printf("Seeding failed: %v\n", err)
	} else {
		fmt.Printf("✅ Database seeded with sample problems successfully.\n")
	}
}
