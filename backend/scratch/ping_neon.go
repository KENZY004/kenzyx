package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	dbURL := os.Getenv("DATABASE_URL")
	fmt.Printf("Connecting to: %s\n", dbURL)
	
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	conn, err := pgx.Connect(ctx, dbURL)
	if err != nil {
		fmt.Printf("❌ Connection failed: %v\n", err)
		return
	}
	defer conn.Close(ctx)

	err = conn.Ping(ctx)
	if err != nil {
		fmt.Printf("❌ Ping failed: %v\n", err)
		return
	}

	fmt.Println("✅ Successfully connected to Neon DB!")
	
	var count int
	err = conn.QueryRow(ctx, "SELECT count(*) FROM problems").Scan(&count)
	if err != nil {
		fmt.Printf("❌ Query failed: %v\n", err)
	} else {
		fmt.Printf("📊 Problems in DB: %d\n", count)
	}
}
