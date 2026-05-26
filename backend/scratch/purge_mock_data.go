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

	email := "kenznajeeb@gmail.com"
	var user struct {
		ID string `bson:"id"`
	}
	err = db.Collection("users").FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		log.Fatal("User not found")
	}
	userID := user.ID

	fmt.Printf("Purging all data for User ID: %s (%s)...\n", userID, email)

	// 1. Delete all submissions
	res, err := db.Collection("submissions").DeleteMany(ctx, bson.M{"user_id": userID})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Deleted %d historical submissions.\n", res.DeletedCount)

	// 2. Reset User Stats
	statsUpdate := bson.M{
		"$set": bson.M{
			"problems_solved":    0,
			"easy_solved":        0,
			"medium_solved":      0,
			"hard_solved":        0,
			"total_score":        0,
			"solved_problem_ids": []string{},
		},
	}
	db.Collection("user_stats").UpdateOne(ctx, bson.M{"user_id": userID}, statsUpdate, options.Update().SetUpsert(true))
	fmt.Println("Reset User Stats (solved counts and score) to zero.")

	// 3. Reset User profile (streak and last_solved)
	userUpdate := bson.M{
		"$set": bson.M{
			"streak":      0,
			"last_solved": nil,
		},
	}
	db.Collection("users").UpdateOne(ctx, bson.M{"id": userID}, userUpdate)
	fmt.Println("Reset Streak to 0 and cleared Last Solved timestamp.")

	fmt.Println("\nSUCCESS! Your account is now fresh and ready for real activity.")
}
