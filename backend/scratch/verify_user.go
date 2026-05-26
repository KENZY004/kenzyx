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
	
	username := "user1"
	res, err := db.Collection("users").UpdateOne(
		ctx, 
		bson.M{"username": username}, 
		bson.M{"$set": bson.M{"is_verified": true}},
	)
	
	if err != nil {
		fmt.Printf("Failed to verify user: %v\n", err)
		return
	}

	if res.ModifiedCount > 0 {
		fmt.Printf("🚀 User '%s' is now VERIFIED! Publishing unlocked.\n", username)
	} else {
		fmt.Printf("User '%s' was already verified or not found.\n", username)
	}
}
