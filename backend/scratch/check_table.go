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

	rows, _ := pool.Query(context.Background(), "SELECT * FROM test_cases LIMIT 5")
	defer rows.Close()
	
	fmt.Printf("Columns: %v\n", rows.FieldDescriptions())
}
