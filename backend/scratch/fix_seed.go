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

	queries := []string{
		// 1. Tags for Climbing Stairs
		`INSERT INTO problem_tags (problem_id, tag_id)
		 SELECT '55555555-5555-5555-5555-555555555555', id FROM tags WHERE slug IN ('dynamic-programming', 'math')
		 ON CONFLICT DO NOTHING`,

		// 2. Tags for Word Search
		`INSERT INTO problem_tags (problem_id, tag_id)
		 SELECT '66666666-6666-6666-6666-666666666666', id FROM tags WHERE slug IN ('backtracking', 'graphs')
		 ON CONFLICT DO NOTHING`,

		// 3. Tags for Number of Islands
		`INSERT INTO problem_tags (problem_id, tag_id)
		 SELECT '77777777-7777-7777-7777-777777777777', id FROM tags WHERE slug IN ('graphs', 'backtracking')
		 ON CONFLICT DO NOTHING`,

		// 4. Tags for Maximum Subarray
		`INSERT INTO problem_tags (problem_id, tag_id)
		 SELECT '88888888-8888-8888-8888-888888888888', id FROM tags WHERE slug IN ('arrays', 'dynamic-programming', 'greedy')
		 ON CONFLICT DO NOTHING`,

		// 5. Missing Test Cases for Word Search
		`INSERT INTO test_cases (problem_id, input, expected, is_sample, order_num) 
		 VALUES 
		 ('66666666-6666-6666-6666-666666666666', '3 4\nABCE\nSFCS\nADEE\nABCCED', 'true', true, 0),
		 ('66666666-6666-6666-6666-666666666666', '3 4\nABCE\nSFCS\nADEE\nSEE', 'true', true, 1),
		 ('66666666-6666-6666-6666-666666666666', '3 4\nABCE\nSFCS\nADEE\nABCB', 'false', false, 2)
		 ON CONFLICT DO NOTHING`,

		// 6. Missing Test Cases for Maximum Subarray
		`INSERT INTO test_cases (problem_id, input, expected, is_sample, order_num) 
		 VALUES 
		 ('88888888-8888-8888-8888-888888888888', '9\n-2 1 -3 4 -1 2 1 -5 4', '6', true, 0),
		 ('88888888-8888-8888-8888-888888888888', '1\n1', '1', true, 1),
		 ('88888888-8888-8888-8888-888888888888', '5\n5 4 -1 7 8', '23', false, 2)
		 ON CONFLICT DO NOTHING`,
	}

	for _, q := range queries {
		_, err := pool.Exec(context.Background(), q)
		if err != nil {
			fmt.Printf("Query failed: %v\n", err)
		}
	}
	fmt.Printf("✅ Tags and missing test cases fixed.\n")
}
