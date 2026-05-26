package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load(".env")
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatal("Failed to connect to db:", err)
	}
	defer pool.Close()

	// Delete kenyx_admin
	tag, err := pool.Exec(ctx, "DELETE FROM users WHERE username = 'kenyx_admin' OR email = 'admin@kenyx.dev'")
	if err != nil {
		log.Fatal("Delete failed:", err)
	}

	fmt.Printf("Successfully deleted %d rows\n", tag.RowsAffected())

	// Print remaining users
	rows, _ := pool.Query(ctx, "SELECT username, email FROM users")
	defer rows.Close()

	fmt.Println("Remaining users:")
	for rows.Next() {
		var u, e string
		_ = rows.Scan(&u, &e)
		fmt.Printf("- %s (%s)\n", u, e)
	}
}
