package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"kenyx/internal/models"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	godotenv.Load()
	uri := os.Getenv("MONGODB_URI")
	
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		fmt.Printf("Error connecting: %v\n", err)
		return
	}

	db := client.Database("kenyx")
	
	problems := []models.Problem{
		{
			ID:          uuid.New().String(),
			Slug:        "two-sum",
			Title:       "Two Sum",
			Description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.",
			Constraints: "- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9",
			Difficulty:  models.DifficultyEasy,
			Status:      models.StatusApproved,
			CreatorName: "Kenyx Official",
			Likes:       150,
			Solves:      1200,
			Acceptance:  48.5,
			CreatedAt:   time.Now(),
			Tags:        []models.Tag{{Name: "Array", Slug: "array"}},
		},
		{
			ID:          uuid.New().String(),
			Slug:        "palindrome-number",
			Title:       "Palindrome Number",
			Description: "Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.",
			Difficulty:  models.DifficultyEasy,
			Status:      models.StatusApproved,
			CreatorName: "Kenyx Official",
			Likes:       85,
			Solves:      950,
			Acceptance:  52.1,
			CreatedAt:   time.Now(),
			Tags:        []models.Tag{{Name: "Math", Slug: "math"}},
		},
		{
			ID:          uuid.New().String(),
			Slug:        "valid-parentheses",
			Title:       "Valid Parentheses",
			Description: "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
			Difficulty:  models.DifficultyMedium,
			Status:      models.StatusApproved,
			CreatorName: "Kenyx Official",
			Likes:       210,
			Solves:      780,
			Acceptance:  39.8,
			CreatedAt:   time.Now(),
			Tags:        []models.Tag{{Name: "Stack", Slug: "stack"}},
		},
	}

	for _, p := range problems {
		_, err := db.Collection("problems").UpdateOne(
			ctx, 
			bson.M{"slug": p.Slug}, 
			bson.M{"$set": p}, 
			options.Update().SetUpsert(true),
		)
		if err != nil {
			fmt.Printf("Failed to seed %s: %v\n", p.Title, err)
		} else {
			fmt.Printf("✅ Seeded: %s\n", p.Title)
		}
	}
	
	fmt.Println("\n🚀 Seeding complete! Go to your browser and refresh.")
}
