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

	// Count actual problems by difficulty
	easy, _ := db.Collection("problems").CountDocuments(ctx, bson.M{"difficulty": "easy", "status": "approved"})
	medium, _ := db.Collection("problems").CountDocuments(ctx, bson.M{"difficulty": "medium", "status": "approved"})
	hard, _ := db.Collection("problems").CountDocuments(ctx, bson.M{"difficulty": "hard", "status": "approved"})

	fmt.Printf("Actual Database Counts -> Easy: %d, Medium: %d, Hard: %d\n", easy, medium, hard)

	// Update the Global Stats in UserStats for all users (or just for stats display)
	// Usually global counts are derived from the problems collection.
	// If the widget shows "0 / 1", it might be using these counts.
	
	_, err = db.Collection("user_stats").UpdateMany(
		ctx,
		bson.M{},
		bson.M{"$set": bson.M{
			"global_easy":   easy,
			"global_medium": medium,
			"global_hard":   hard,
		}},
	)

	if err != nil {
		fmt.Printf("Update failed: %v\n", err)
	} else {
		fmt.Printf("✅ Global stats updated for all users!\n")
	}
}
