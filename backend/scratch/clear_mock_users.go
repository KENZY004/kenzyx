package main

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		fmt.Println("Error loading .env file")
		return
	}
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		fmt.Println("DATABASE_URL is empty")
		return
	}
	fmt.Printf("Connecting to DB: %s...\n", strings.Split(dbURL, "@")[1])
	
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := pgx.Connect(ctx, dbURL)
	if err != nil {
		fmt.Println("Error connecting:", err)
		return
	}
	defer conn.Close(context.Background())

	// Show remaining users before delete
	rows, err := conn.Query(ctx, "SELECT username, email FROM users")
	if err != nil {
		fmt.Println("Query error:", err)
		return
	}
	fmt.Println("Users before deletion:")
	for rows.Next() {
		var username, email string
		rows.Scan(&username, &email)
		fmt.Printf("- %s | %s\n", username, email)
	}
	rows.Close()

	res, err := conn.Exec(ctx, "DELETE FROM users WHERE email != 'kenznajeeb@gmail.com' AND username != 'user1'")
	if err != nil {
		fmt.Println("Delete error:", err)
		return
	}
	fmt.Printf("\nDeleted %d mock users.\n\n", res.RowsAffected())

	// Show remaining users after delete
	rows2, _ := conn.Query(ctx, "SELECT username, email FROM users")
	fmt.Println("Users after deletion:")
	for rows2.Next() {
		var username, email string
		rows2.Scan(&username, &email)
		fmt.Printf("- %s | %s\n", username, email)
	}
	rows2.Close()
}
