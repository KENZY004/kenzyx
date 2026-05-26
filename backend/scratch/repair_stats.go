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

	// 1. Repair points for all problems
	fmt.Println("Updating points for all problems...")
	problemsCol := db.Collection("problems")
	
	// Update Easy
	problemsCol.UpdateMany(ctx, bson.M{"difficulty": "easy"}, bson.M{"$set": bson.M{"points": 10}})
	// Update Medium
	problemsCol.UpdateMany(ctx, bson.M{"difficulty": "medium"}, bson.M{"$set": bson.M{"points": 20}})
	// Update Hard
	problemsCol.UpdateMany(ctx, bson.M{"difficulty": "hard"}, bson.M{"$set": bson.M{"points": 30}})
	fmt.Println("Points repaired.")

	// 2. Find your user
	var user struct {
		ID string `bson:"id"`
	}
	err = db.Collection("users").FindOne(ctx, bson.M{"email": "kenznajeeb@gmail.com"}).Decode(&user)
	if err != nil {
		log.Fatal("Could not find user kenznajeeb@gmail.com")
	}
	userID := user.ID

	// 3. Recalculate stats based on Accepted submissions
	fmt.Printf("Recalculating stats for user %s...\n", userID)
	
	cursor, _ := db.Collection("submissions").Find(ctx, bson.M{"user_id": userID, "status": "accepted"})
	
	solvedProblemIDs := make(map[string]bool)
	score := 0
	easy := 0
	medium := 0
	hard := 0

	for cursor.Next(ctx) {
		var sub struct {
			ProblemID string `bson:"problem_id"`
		}
		cursor.Decode(&sub)
		
		if !solvedProblemIDs[sub.ProblemID] {
			solvedProblemIDs[sub.ProblemID] = true
			
			// Get points for this problem
			var prob struct {
				Points int `bson:"points"`
				Difficulty string `bson:"difficulty"`
			}
			db.Collection("problems").FindOne(ctx, bson.M{"id": sub.ProblemID}).Decode(&prob)
			
			score += prob.Points
			switch prob.Difficulty {
			case "easy": easy++
			case "medium": medium++
			case "hard": hard++
			}
		}
	}

	// 4. Update the user_stats collection
	idList := []string{}
	for id := range solvedProblemIDs {
		idList = append(idList, id)
	}

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

	fmt.Printf("Stats updated: Score=%d, TotalSolved=%d (E:%d, M:%d, H:%d)\n", score, len(idList), easy, medium, hard)
}
