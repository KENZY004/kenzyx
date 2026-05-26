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

	var pCount, uCount, sCount int
	pool.QueryRow(context.Background(), "SELECT count(*) FROM problems").Scan(&pCount)
	pool.QueryRow(context.Background(), "SELECT count(*) FROM users").Scan(&uCount)
	pool.QueryRow(context.Background(), "SELECT count(*) FROM submissions").Scan(&sCount)

	fmt.Printf("--- Database Stats ---\n")
	fmt.Printf("Problems:    %d\n", pCount)
	fmt.Printf("Users:       %d\n", uCount)
	fmt.Printf("Submissions: %d\n", sCount)
	fmt.Printf("----------------------\n")
}
