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

	// 1. Find user
	var user struct {
		ID string `bson:"id"`
	}
	err = db.Collection("users").FindOne(ctx, bson.M{"email": "kenznajeeb@gmail.com"}).Decode(&user)
	if err != nil {
		log.Fatal("User not found")
	}
	userID := user.ID

	// 2. Find all unique problems solved by this user
	fmt.Printf("Analyzing submissions for user %s...\n", userID)
	
	// We'll use problem_slug to be safe as it's consistent
	cursor, _ := db.Collection("submissions").Find(ctx, bson.M{"user_id": userID, "status": "accepted"})
	
	solvedSlugs := make(map[string]bool)
	var lastProblemID string
	_ = lastProblemID

	for cursor.Next(ctx) {
		var sub struct {
			ProblemSlug string `bson:"problem_slug"`
			ProblemID   string `bson:"problem_id"`
		}
		cursor.Decode(&sub)
		if sub.ProblemSlug != "" {
			solvedSlugs[sub.ProblemSlug] = true
			lastProblemID = sub.ProblemID
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
			Points int `bson:"points"`
		}
		err := db.Collection("problems").FindOne(ctx, bson.M{"slug": slug}).Decode(&prob)
		if err == nil {
			idList = append(idList, prob.ID)
			
			// Ensure points are correct based on difficulty
			pts := 10
			switch prob.Difficulty {
			case "medium": pts = 20; medium++
			case "hard": pts = 30; hard++
			default: pts = 10; easy++
			}
			score += pts
			
			// Update the problem itself just in case
			db.Collection("problems").UpdateOne(ctx, bson.M{"slug": slug}, bson.M{"$set": bson.M{"points": pts}})
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
			"updated_at":        context.Background(), // will be converted to date by mongo
		},
	}
	db.Collection("user_stats").UpdateOne(ctx, bson.M{"user_id": userID}, update, options.Update().SetUpsert(true))

	fmt.Printf("Stats fixed! Score: %d, Solved: %d (E:%d, M:%d, H:%d)\n", score, len(idList), easy, medium, hard)
}
