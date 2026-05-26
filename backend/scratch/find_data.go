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
	
	// Try to connect to postgres database first to list other databases
	baseConn, err := pgx.Connect(context.Background(), "postgresql://postgres:postgres@127.0.0.1:5432/postgres?sslmode=disable")
	if err == nil {
		fmt.Println("--- Databases on this server ---")
		rows, _ := baseConn.Query(context.Background(), "SELECT datname FROM pg_database WHERE datistemplate = false;")
		for rows.Next() {
			var name string
			rows.Scan(&name)
			fmt.Println(" -", name)
		}
		baseConn.Close(context.Background())
	}

	fmt.Println("\n--- Tables in current database ---")
	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		fmt.Printf("Error connecting: %v\n", err)
		return
	}
	defer conn.Close(context.Background())

	rows, _ := conn.Query(context.Background(), "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
	for rows.Next() {
		var name string
		rows.Scan(&name)
		
		var count int
		conn.QueryRow(context.Background(), fmt.Sprintf("SELECT count(*) FROM %s", name)).Scan(&count)
		fmt.Printf(" Table: %-20s Rows: %d\n", name, count)
	}
}
