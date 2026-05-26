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
		// Climbing Stairs
		`INSERT INTO problems (id, slug, title, description, constraints, input_format, output_format, difficulty, status) 
		 VALUES ('55555555-5555-5555-5555-555555555555', 'climbing-stairs', 'Climbing Stairs', 'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?', '1 <= n <= 45', 'A single integer n.', 'A single integer representing the number of ways.', 'easy', 'approved') ON CONFLICT DO NOTHING`,
		
		`INSERT INTO test_cases (problem_id, input, expected, is_sample, order_num) 
		 VALUES ('55555555-5555-5555-5555-555555555555', '2', '2', true, 0),
				('55555555-5555-5555-5555-555555555555', '3', '3', true, 1),
				('55555555-5555-5555-5555-555555555555', '10', '89', false, 2) ON CONFLICT DO NOTHING`,

		// Number of Islands
		`INSERT INTO problems (id, slug, title, description, constraints, input_format, output_format, difficulty, status) 
		 VALUES ('77777777-7777-7777-7777-777777777777', 'number-of-islands', 'Number of Islands', 'Given an m x n 2D binary grid which represents a map of 1s (land) and 0s (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.', 'm == grid.length, n == grid[i].length, 1 <= m, n <= 300', 'First line: m, n. Following m lines: n characters (0 or 1).', 'A single integer representing the island count.', 'medium', 'approved') ON CONFLICT DO NOTHING`,
		
		`INSERT INTO test_cases (problem_id, input, expected, is_sample, order_num) 
		 VALUES ('77777777-7777-7777-7777-777777777777', '4 5\n11110\n11010\n11000\n00000', '1', true, 0),
				('77777777-7777-7777-7777-777777777777', '4 5\n11000\n11000\n00100\n00011', '3', true, 1) ON CONFLICT DO NOTHING`,

		// Word Search
		`INSERT INTO problems (id, slug, title, description, constraints, input_format, output_format, difficulty, status) 
		 VALUES ('66666666-6666-6666-6666-666666666666', 'word-search', 'Word Search', 'Given an m x n grid of characters board and a string word, return true if word exists in the grid.', 'm == board.length, n == board[0].length, 1 <= m, n <= 6', 'First line: m, n. Following m lines: n characters. Final line: word.', 'true or false.', 'medium', 'approved') ON CONFLICT DO NOTHING`,

		// Maximum Subarray
		`INSERT INTO problems (id, slug, title, description, constraints, input_format, output_format, difficulty, status) 
		 VALUES ('88888888-8888-8888-8888-888888888888', 'maximum-subarray', 'Maximum Subarray', 'Given an integer array nums, find the subarray with the largest sum, and return its sum.', '1 <= nums.length <= 10^5, -10^4 <= nums[i] <= 10^4', 'First line: n (size). Second line: n space-separated integers.', 'A single integer representing the maximum sum.', 'easy', 'approved') ON CONFLICT DO NOTHING`,
	}

	for _, q := range queries {
		_, err := pool.Exec(context.Background(), q)
		if err != nil {
			fmt.Printf("Query failed: %v\n", err)
		}
	}
	fmt.Printf("✅ Additional problems seeded successfully.\n")
}
