package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	godotenv.Load()
	uri := os.Getenv("MONGODB_URI")
	fmt.Printf("Attempting to connect to MongoDB: %s\n", uri)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		fmt.Printf("❌ Failed to create client: %v\n", err)
		return
	}

	err = client.Ping(ctx, nil)
	if err != nil {
		fmt.Printf("❌ Could not ping MongoDB: %v\n", err)
		return
	}

	fmt.Println("✅ Successfully connected to MongoDB!")
	
	databases, err := client.ListDatabaseNames(ctx, map[string]interface{}{})
	if err == nil {
		fmt.Println("Found databases:", databases)
	}
}
