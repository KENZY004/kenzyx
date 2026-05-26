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
	
	// Fix Easy problems (10 points)
	db.Collection("problems").UpdateMany(ctx, bson.M{"difficulty": "easy", "points": 0}, bson.M{"$set": bson.M{"points": 10}})
	
	// Fix Medium problems (20 points)
	db.Collection("problems").UpdateMany(ctx, bson.M{"difficulty": "medium", "points": 0}, bson.M{"$set": bson.M{"points": 20}})
	
	// Fix Hard problems (30 points)
	db.Collection("problems").UpdateMany(ctx, bson.M{"difficulty": "hard", "points": 0}, bson.M{"$set": bson.M{"points": 30}})

	fmt.Println("Successfully updated all legacy problems with correct 10-20-30 points!")
}
