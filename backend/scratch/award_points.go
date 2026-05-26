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

func main() {
	godotenv.Load()
	uri := os.Getenv("MONGODB_URI")
	
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	db := client.Database("kenyx")
	
	userID := "dc74f02a-8ae1-4ade-b52b-648adf3cae18"
	
	update := bson.M{
		"$set": bson.M{
			"problems_solved": 1,
			"medium_solved":   1,
			"total_score":     20,
			"updated_at":      time.Now(),
		},
	}

	_, err = db.Collection("user_stats").UpdateOne(
		ctx,
		bson.M{"user_id": userID},
		update,
		options.Update().SetUpsert(true),
	)
	
	if err != nil {
		fmt.Printf("Error updating stats: %v\n", err)
	} else {
		fmt.Println("Successfully awarded 30 points and 1 Medium solve to user1!")
	}
}

