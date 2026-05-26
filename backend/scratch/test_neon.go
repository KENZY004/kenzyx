package main

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	url := "postgresql://neondb_owner:npg_Oqu4LaPcxBF3@ep-lively-hill-a49xumnu.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=10"
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	fmt.Println("Connecting to UNPOOLED NeonDB...")
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		fmt.Println("Failed to connect:", err)
		return
	}
	defer pool.Close()

	var result int
	err = pool.QueryRow(ctx, "SELECT 1").Scan(&result)
	if err != nil {
		fmt.Println("Query failed:", err)
		return
	}
	fmt.Println("SUCCESS! Connection established. Result:", result)
}
