package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"kenyx/internal/models"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	godotenv.Load()
	uri := os.Getenv("MONGODB_URI")
	
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		fmt.Printf("Error connecting: %v\n", err)
		return
	}

	db := client.Database("kenyx")
	
	jsonData := `[{"id":"11111111-1111-1111-1111-111111111111","slug":"two-sum","title":"Two Sum","description":"Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order. Please output the indices separated by a space.","constraints":"2 <= nums.length <= 10^4\\n-10^9 <= nums[i] <= 10^9\\n-10^9 <= target <= 10^9","input_format":"Line 1: An integer n (array length)\\nLine 2: n space-separated integers\\nLine 3: An integer target","output_format":"Two space-separated integers representing the indices.","difficulty":"easy","status":"approved","creator_id":null,"likes":0,"solves":0,"acceptance":0,"is_daily":true,"rejection_note":"","created_at":"2026-04-27T07:48:10.426953+00:00","updated_at":"2026-04-27T07:48:10.426953+00:00","comparison_mode":"sorted_numbers"}, {"id":"22222222-2222-2222-2222-222222222222","slug":"reverse-string","title":"Reverse String","description":"Write a function that reverses a string. The input string is given as a single line of text. Your task is to print the reversed string to the standard output.","constraints":"1 <= s.length <= 10^5\\ns consists of printable ascii characters.","input_format":"A single line representing the string.","output_format":"The reversed string.","difficulty":"easy","status":"approved","creator_id":null,"likes":0,"solves":0,"acceptance":0,"is_daily":false,"rejection_note":"","created_at":"2026-04-27T07:48:10.426953+00:00","updated_at":"2026-04-27T07:48:10.426953+00:00","comparison_mode":"exact"}, {"id":"33333333-3333-3333-3333-333333333333","slug":"longest-substring-without-repeating","title":"Longest Substring Without Repeating Characters","description":"Given a string s, find the length of the longest substring without repeating characters.","constraints":"0 <= s.length <= 5 * 10^4\\ns consists of English letters, digits, symbols and spaces.","input_format":"A single line representing the string.","output_format":"An integer representing the length of the longest substring.","difficulty":"medium","status":"approved","creator_id":null,"likes":0,"solves":0,"acceptance":0,"is_daily":false,"rejection_note":"","created_at":"2026-04-27T07:48:10.426953+00:00","updated_at":"2026-04-27T07:48:10.426953+00:00","comparison_mode":"exact"}, {"id":"44444444-4444-4444-4444-444444444444","slug":"median-of-two-sorted-arrays","title":"Median of Two Sorted Arrays","description":"Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).","constraints":"nums1.length == m\\nnums2.length == n\\n0 <= m <= 1000\\n0 <= n <= 1000\\n1 <= m + n <= 2000\\n-10^6 <= nums1[i], nums2[i] <= 10^6","input_format":"Line 1: m (size of nums1)\\nLine 2: m space-separated integers\\nLine 3: n (size of nums2)\\nLine 4: n space-separated integers","output_format":"A single floating point number representing the median.","difficulty":"hard","status":"approved","creator_id":null,"likes":0,"solves":0,"acceptance":0,"is_daily":false,"rejection_note":"","created_at":"2026-04-27T07:48:10.426953+00:00","updated_at":"2026-04-27T07:48:10.426953+00:00","comparison_mode":"sorted_numbers"}, {"id":"55555555-5555-5555-5555-555555555555","slug":"climbing-stairs","title":"Climbing Stairs","description":"You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?","constraints":"1 <= n <= 45","input_format":"A single integer n.","output_format":"A single integer representing the number of ways.","difficulty":"easy","status":"approved","creator_id":null,"likes":0,"solves":0,"acceptance":0,"is_daily":false,"rejection_note":"","created_at":"2026-04-27T07:52:22.265173+00:00","updated_at":"2026-04-27T07:52:22.265173+00:00","comparison_mode":"exact"}, {"id":"77777777-7777-7777-7777-777777777777","slug":"number-of-islands","title":"Number of Islands","description":"Given an m x n 2D binary grid which represents a map of 1s (land) and 0s (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.","constraints":"m == grid.length, n == grid[i].length, 1 <= m, n <= 300","input_format":"First line: m, n. Following m lines: n characters (0 or 1).","output_format":"A single integer representing the island count.","difficulty":"medium","status":"approved","creator_id":null,"likes":0,"solves":0,"acceptance":0,"is_daily":false,"rejection_note":"","created_at":"2026-04-27T07:52:24.768629+00:00","updated_at":"2026-04-27T07:52:24.768629+00:00","comparison_mode":"exact"}, {"id":"66666666-6666-6666-6666-666666666666","slug":"word-search","title":"Word Search","description":"Given an m x n grid of characters board and a string word, return true if word exists in the grid.","constraints":"m == board.length, n == board[0].length, 1 <= m, n <= 6","input_format":"First line: m, n. Following m lines: n characters. Final line: word.","output_format":"true or false.","difficulty":"medium","status":"approved","creator_id":null,"likes":0,"solves":0,"acceptance":0,"is_daily":false,"rejection_note":"","created_at":"2026-04-27T07:52:25.888413+00:00","updated_at":"2026-04-27T07:52:25.888413+00:00","comparison_mode":"exact"}, {"id":"88888888-8888-8888-8888-888888888888","slug":"maximum-subarray","title":"Maximum Subarray","description":"Given an integer array nums, find the subarray with the largest sum, and return its sum.","constraints":"1 <= nums.length <= 10^5, -10^4 <= nums[i] <= 10^4","input_format":"First line: n (size). Second line: n space-separated integers.","output_format":"A single integer representing the maximum sum.","difficulty":"easy","status":"approved","creator_id":null,"likes":0,"solves":0,"acceptance":0,"is_daily":false,"rejection_note":"","created_at":"2026-04-27T07:52:26.241018+00:00","updated_at":"2026-04-27T07:52:26.241018+00:00","comparison_mode":"exact"}]`

	var rawProblems []map[string]interface{}
	json.Unmarshal([]byte(jsonData), &rawProblems)

	for _, rp := range rawProblems {
		p := models.Problem{
			ID:             rp["id"].(string),
			Slug:           rp["slug"].(string),
			Title:          rp["title"].(string),
			Description:    rp["description"].(string),
			Constraints:    rp["constraints"].(string),
			InputFormat:    rp["input_format"].(string),
			OutputFormat:   rp["output_format"].(string),
			Difficulty:     models.Difficulty(rp["difficulty"].(string)),
			Status:         models.ProblemStatus(rp["status"].(string)),
			IsDaily:        rp["is_daily"].(bool),
			ComparisonMode: rp["comparison_mode"].(string),
			CreatorName:    "Kenyx Official",
		}
		
		// Parsing dates
		createdAt, _ := time.Parse(time.RFC3339, rp["created_at"].(string))
		p.CreatedAt = createdAt
		p.UpdatedAt = createdAt

		_, err := db.Collection("problems").UpdateOne(
			ctx, 
			bson.M{"id": p.ID}, 
			bson.M{"$set": p}, 
			options.Update().SetUpsert(true),
		)
		if err != nil {
			fmt.Printf("Failed to import %s: %v\n", p.Title, err)
		} else {
			fmt.Printf("✅ Imported: %s\n", p.Title)
		}
	}
	
	fmt.Println("\n🚀 Part 1 Complete! Problems are now in Atlas.")
}
