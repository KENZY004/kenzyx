package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	godotenv.Load()
	uri := os.Getenv("MONGODB_URI")
	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal(err)
	}
	db := client.Database("kenyx")

	// 1. Get User ID for kenz
	var user struct {
		ID string `bson:"id"`
	}
	db.Collection("users").FindOne(context.Background(), bson.M{"username": "kenz"}).Decode(&user)

	// 2. Find all UNIQUE problems solved by kenz
	cursor, err := db.Collection("submissions").Find(context.Background(), bson.M{
		"user_id": user.ID,
		"status":  "accepted",
	})
	if err != nil {
		log.Fatal(err)
	}
	defer cursor.Close(context.Background())

	solvedProblemIDs := make(map[string]bool)
	var submissions []struct {
		ProblemID string `bson:"problem_id"`
	}
	cursor.All(context.Background(), &submissions)

	for _, s := range submissions {
		solvedProblemIDs[s.ProblemID] = true
	}

	// 3. Calculate new stats
	var easy, medium, hard, totalScore int
	var finalIDs []string

	for id := range solvedProblemIDs {
		var prob struct {
			ID         string `bson:"id"`
			Difficulty string `bson:"difficulty"`
			Points     int    `bson:"points"`
		}
		err = db.Collection("problems").FindOne(context.Background(), bson.M{"id": id}).Decode(&prob)
		if err != nil {
			fmt.Printf("Skipping invalid/deleted problem ID: %s\n", id)
			continue
		}

		finalIDs = append(finalIDs, id)
		totalScore += prob.Points
		switch prob.Difficulty {
		case "easy":
			easy++
		case "medium":
			medium++
		case "hard":
			hard++
		}
	}

	// 4. Update the user_stats document
	update := bson.M{
		"$set": bson.M{
			"problems_solved":    len(finalIDs),
			"easy_solved":        easy,
			"medium_solved":      medium,
			"hard_solved":        hard,
			"total_score":       totalScore,
			"solved_problem_ids": finalIDs,
		},
	}

	_, err = db.Collection("user_stats").UpdateOne(context.Background(), bson.M{"user_id": user.ID}, update)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Stats recalibrated for kenz:\n")
	fmt.Printf("- Easy: %d\n", easy)
	fmt.Printf("- Medium: %d\n", medium)
	fmt.Printf("- Hard: %d\n", hard)
	fmt.Printf("- Score: %d\n", totalScore)
}
