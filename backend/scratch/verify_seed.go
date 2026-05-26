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

	var pCount, tCount int
	pool.QueryRow(context.Background(), "SELECT COUNT(*) FROM problems").Scan(&pCount)
	pool.QueryRow(context.Background(), "SELECT COUNT(*) FROM test_cases").Scan(&tCount)
	
	fmt.Printf("Verification Report:\n")
	fmt.Printf("- Problems: %d\n", pCount)
	fmt.Printf("- Test Cases: %d\n", tCount)

	if pCount > 0 && tCount > 0 {
		fmt.Printf("✅ DB is healthy and seeded.\n")
	} else {
		fmt.Printf("❌ DB seeding might have failed.\n")
	}
}
