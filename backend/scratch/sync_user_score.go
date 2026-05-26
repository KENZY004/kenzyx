package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Submission struct {
	ProblemID string `bson:"problem_id"`
	Status    string `bson:"status"`
}

type Problem struct {
	ID         string `bson:"id"`
	Difficulty string `bson:"difficulty"`
	Points     int    `bson:"points"`
}

func main() {
	godotenv.Load()
	uri := os.Getenv("MONGODB_URI")
	
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	db := client.Database("kenyx")
	userID := "dc74f02a-8ae1-4ade-b52b-648adf3cae18"

	// Find all accepted submissions for this user
	cursor, _ := db.Collection("submissions").Find(ctx, bson.M{"user_id": userID, "status": "accepted"})
	var subs []Submission
	cursor.All(ctx, &subs)

	// Keep track of unique solved problems to avoid double counting
	solvedMap := make(map[string]bool)
	totalScore := 0
	easySolved := 0
	mediumSolved := 0
	hardSolved := 0

	for _, sub := range subs {
		if solvedMap[sub.ProblemID] {
			continue
		}
		
		var prob Problem
		err := db.Collection("problems").FindOne(ctx, bson.M{"id": sub.ProblemID}).Decode(&prob)
		if err == nil {
			solvedMap[sub.ProblemID] = true
			
			// Use the points from the problem
			points := prob.Points
			if points == 0 {
				// Fallback if still 0
				switch prob.Difficulty {
				case "medium": points = 20
				case "hard": points = 30
				default: points = 10
				}
			}
			
			totalScore += points
			switch prob.Difficulty {
			case "easy": easySolved++
			case "medium": mediumSolved++
			case "hard": hardSolved++
			}
		}
	}

	// Update user stats
	update := bson.M{
		"$set": bson.M{
			"problems_solved": len(solvedMap),
			"easy_solved":     easySolved,
			"medium_solved":   mediumSolved,
			"hard_solved":     hardSolved,
			"total_score":     totalScore,
			"updated_at":      time.Now(),
		},
	}

	db.Collection("user_stats").UpdateOne(ctx, bson.M{"user_id": userID}, update, options.Update().SetUpsert(true))

	fmt.Printf("Sync Complete! Solved: %d, Score: %d (E:%d, M:%d, H:%d)\n", len(solvedMap), totalScore, easySolved, mediumSolved, hardSolved)
}
