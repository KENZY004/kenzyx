package main

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	// Use LOCAL db for this check
	dbURL := "postgresql://postgres:postgres@127.0.0.1:5432/kenyx?sslmode=disable"
	
	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	defer conn.Close(context.Background())

	fmt.Println("Searching local database for any 'Two Sum' or 'Longest Substring'...")
	
	tables := []string{"problems", "problem_list", "submissions"}
	for _, t := range tables {
		var exists bool
		query := fmt.Sprintf("SELECT EXISTS(SELECT 1 FROM %s WHERE title ILIKE '%%Two Sum%%' OR description ILIKE '%%Two Sum%%')", t)
		if t == "submissions" {
			query = "SELECT EXISTS(SELECT 1 FROM submissions WHERE code ILIKE '%Two Sum%')"
		}
		
		err := conn.QueryRow(context.Background(), query).Scan(&exists)
		if err == nil && exists {
			fmt.Printf("✅ FOUND potential data in table: %s\n", t)
		} else {
			fmt.Printf("❌ No data in table: %s\n", t)
		}
	}
}
