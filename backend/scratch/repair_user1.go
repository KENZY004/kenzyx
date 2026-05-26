package main

import (
	"context"
	"fmt"
	"log"

	"go.mongodb.org/mongo-driver/bson"
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

	email := "kenzninnu409@gmail.com" // YOUR ACTIVE ACCOUNT

	// 1. Find user
	var user struct {
		ID string `bson:"id"`
	}
	err = db.Collection("users").FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		log.Fatalf("User %s not found", email)
	}
	userID := user.ID

	// 2. Find all unique problems solved by this user
	fmt.Printf("Repairing stats for user1 (ID: %s)...\n", userID)
	
	cursor, _ := db.Collection("submissions").Find(ctx, bson.M{"user_id": userID, "status": "accepted"})
	
	solvedSlugs := make(map[string]bool)
	for cursor.Next(ctx) {
		var sub struct {
			ProblemSlug string `bson:"problem_slug"`
		}
		cursor.Decode(&sub)
		if sub.ProblemSlug != "" {
			solvedSlugs[sub.ProblemSlug] = true
		}
	}

	score := 0
	easy := 0
	medium := 0
	hard := 0
	idList := []string{}

	for slug := range solvedSlugs {
		var prob struct {
			ID string `bson:"id"`
			Difficulty string `bson:"difficulty"`
		}
		err := db.Collection("problems").FindOne(ctx, bson.M{"slug": slug}).Decode(&prob)
		if err == nil {
			idList = append(idList, prob.ID)
			switch prob.Difficulty {
			case "medium": score += 20; medium++
			case "hard": score += 30; hard++
			default: score += 10; easy++
			}
		}
	}

	// 3. Update User Stats
	update := bson.M{
		"$set": bson.M{
			"total_score":        score,
			"problems_solved":    len(idList),
			"easy_solved":        easy,
			"medium_solved":      medium,
			"hard_solved":        hard,
			"solved_problem_ids": idList,
		},
	}
	db.Collection("user_stats").UpdateOne(ctx, bson.M{"user_id": userID}, update, options.Update().SetUpsert(true))

	fmt.Printf("SUCCESS! User1 Score is now: %d, Solved: %d (E:%d, M:%d, H:%d)\n", score, len(idList), easy, medium, hard)
}
