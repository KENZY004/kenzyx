package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	ctx := context.Background()
	
	// 1. Connect to Mongo
	uri := "mongodb+srv://minhakenzyom23_db_user:RJB4lGidtiirfnvG@cluster0.rrbuizd.mongodb.net/kenyx?retryWrites=true&w=majority&appName=Cluster0"
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal(err)
	}
	db := client.Database("kenyx")

	// 2. Find any user (or specific one)
	var user struct {
		ID string `bson:"id"`
		Username string `bson:"username"`
	}
	// Try to find by email first
	err = db.Collection("users").FindOne(ctx, bson.M{"email": "kenznajeeb@gmail.com"}).Decode(&user)
	if err != nil {
		// If not found, just take the first user in the DB
		fmt.Println("Warning: Could not find kenznajeeb@gmail.com, looking for any user...")
		err = db.Collection("users").FindOne(ctx, bson.M{}).Decode(&user)
		if err != nil {
			log.Fatal("No users found in database. Please sign up on the website first!")
		}
	}
	userID := user.ID
	fmt.Printf("Seeding activity for user: %s (ID: %s)\n", user.Username, userID)

	// 3. Clear existing submissions to avoid duplicates if re-running
	_, _ = db.Collection("submissions").DeleteMany(ctx, bson.M{"user_id": userID})

	// 4. Generate random activity for the last 365 days
	fmt.Println("Generating mock activity for 365 days...")
	submissionsCol := db.Collection("submissions")
	
	now := time.Now()
	count := 0
	for i := 0; i < 365; i++ {
		date := now.AddDate(0, 0, -i)
		
		// Randomly decide if this day has activity (60% chance)
		if rand.Float64() < 0.6 {
			// Random number of submissions (1 to 15)
			numSubs := rand.Intn(15) + 1
			for j := 0; j < numSubs; j++ {
				sub := bson.M{
					"id":           fmt.Sprintf("mock-sub-%d-%d", i, j),
					"user_id":      userID,
					"username":     user.Username,
					"problem_id":   "mock-problem",
					"problem_slug": "two-sum",
					"language":     "go",
					"status":       "accepted",
					"runtime_ms":   rand.Intn(100),
					"memory_kb":    rand.Intn(5000),
					"created_at":   date.Add(time.Duration(rand.Intn(24)) * time.Hour),
				}
				_, err := submissionsCol.InsertOne(ctx, sub)
				if err != nil {
					log.Printf("Error inserting: %v", err)
				}
				count++
			}
		}
	}

	fmt.Printf("Successfully seeded %d mock submissions for 365 days! Refresh your dashboard now.\n", count)
}
