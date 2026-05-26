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
	
	var raw bson.M
	err = db.Collection("problems").FindOne(ctx, bson.M{"title": "Maximum Subarray Sum with One Deletion"}).Decode(&raw)
	if err != nil {
		fmt.Printf("Error finding problem: %v\n", err)
		return
	}

	fmt.Println("--- Raw Keys in DB ---")
	for k := range raw {
		fmt.Println(k)
	}
}
