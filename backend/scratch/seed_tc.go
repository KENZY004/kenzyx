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

	q := `INSERT INTO test_cases (problem_id, input, expected, is_sample, order_num) 
	VALUES 
		('11111111-1111-1111-1111-111111111111', '4\n2 7 11 15\n9', '0 1', true, 0),
		('11111111-1111-1111-1111-111111111111', '3\n3 2 4\n6', '1 2', true, 1),
		('11111111-1111-1111-1111-111111111111', '2\n3 3\n6', '0 1', false, 2),
		('11111111-1111-1111-1111-111111111111', '5\n10 20 30 40 50\n90', '3 4', false, 3),
		('22222222-2222-2222-2222-222222222222', 'hello', 'olleh', true, 0),
		('22222222-2222-2222-2222-222222222222', 'Kenyx', 'xyneK', true, 1),
		('33333333-3333-3333-3333-333333333333', 'abcabcbb', '3', true, 0),
		('44444444-4444-4444-4444-444444444444', '2\n1 3\n1\n2', '2.0', true, 0)`

	_, err := pool.Exec(context.Background(), q)
	if err != nil {
		fmt.Printf("TC Insert failed: %v\n", err)
	} else {
		fmt.Printf("✅ Test cases inserted successfully.\n")
	}
}
