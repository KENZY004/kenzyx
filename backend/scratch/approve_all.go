package main

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	dbURL := os.Getenv("DATABASE_URL")
	
	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	defer conn.Close(context.Background())

	res, err := conn.Exec(context.Background(), "UPDATE problems SET status = 'approved' WHERE status = 'pending'")
	if err != nil {
		fmt.Printf("❌ Failed to approve problems: %v\n", err)
	} else {
		fmt.Printf("✅ Success! Approved %d problems.\n", res.RowsAffected())
	}
}
