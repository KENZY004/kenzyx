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

	now := time.Now().UTC()
	update := bson.M{
		"$set": bson.M{
			"streak":      1,
			"last_solved": now,
		},
	}

	_, err = db.Collection("users").UpdateOne(ctx, bson.M{"id": userID}, update)
	
	if err != nil {
		fmt.Printf("Error updating streak: %v\n", err)
	} else {
		fmt.Println("Successfully set user1 streak to 1 day!")
	}
}
