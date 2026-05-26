package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"kenyx/internal/models"

	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	ctx := context.Background()
	uri := "mongodb+srv://minhakenzyom23_db_user:RJB4lGidtiirfnvG@cluster0.rrbuizd.mongodb.net/kenyx?retryWrites=true&w=majority&appName=Cluster0"
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal(err)
	}
	db := client.Database("kenyx")

	p := models.Problem{
		ID:          uuid.New().String(),
		Slug:        "trapping-rain-water",
		Title:       "Trapping Rain Water",
		Description: "Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
		Constraints: "- `n == height.length`\n- `1 <= n <= 2 * 10^4`\n- `0 <= height[i] <= 10^5`",
		InputFormat: "A single line containing `n` space-separated integers representing the elevation map.",
		OutputFormat: "A single integer representing the total amount of water trapped.",
		Difficulty:  models.DifficultyHard,
		Status:      models.StatusApproved,
		CreatorName: "Kenyx User", // Marked as user now to prevent deletion
		Likes:       0,
		Solves:      0,
		Acceptance:  0,
		ComparisonMode: "exact",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		Tags:        []models.Tag{{Name: "Array", Slug: "array"}, {Name: "Two Pointers", Slug: "two-pointers"}},
	}

	// Add test cases
	testCases := []models.TestCase{
		{ID: uuid.New().String(), ProblemID: p.ID, Input: "0 1 0 2 1 0 1 3 2 1 2 1", Expected: "6", IsSample: true},
		{ID: uuid.New().String(), ProblemID: p.ID, Input: "4 2 0 3 2 5", Expected: "9", IsSample: true},
	}
	p.TestCases = testCases

	_, err = db.Collection("problems").InsertOne(ctx, p)
	if err != nil {
		fmt.Printf("Restoration failed: %v\n", err)
	} else {
		fmt.Printf("✅ 'Trapping Rain Water' Restored Successfully!\n")
	}
}
