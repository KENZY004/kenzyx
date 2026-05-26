package main

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5"
)

func main() {
	conn, err := pgx.Connect(context.Background(), "postgresql://postgres:postgres@127.0.0.1:5432/postgres?sslmode=disable")
	if err != nil {
		fmt.Printf("Connection failed: %v\n", err)
		return
	}
	defer conn.Close(context.Background())

	var exists bool
	err = conn.QueryRow(context.Background(), "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = 'kenyx')").Scan(&exists)
	if err != nil {
		fmt.Printf("Query failed: %v\n", err)
		return
	}

	if exists {
		fmt.Println("Database 'kenyx' exists on port 5432")
	} else {
		fmt.Println("Database 'kenyx' does NOT exist on port 5432")
	}
}
