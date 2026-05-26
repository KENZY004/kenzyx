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

	var count int
	pool.QueryRow(context.Background(), "SELECT COUNT(*) FROM users").Scan(&count)
	fmt.Printf("Total users: %d\n", count)

	rows, _ := pool.Query(context.Background(), "SELECT username, email, role FROM users")
	for rows.Next() {
		var username, email, role string
		rows.Scan(&username, &email, &role)
		fmt.Printf("- %s | %s (%s)\n", username, email, role)
	}
}
