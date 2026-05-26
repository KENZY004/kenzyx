package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"kenyx/internal/models"

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
	
	// Check the latest created problem
	opts := options.FindOne().SetSort(bson.M{"created_at": -1})
	var p models.Problem
	err = db.Collection("problems").FindOne(ctx, bson.M{}, opts).Decode(&p)
	if err != nil {
		fmt.Printf("Error finding problem: %v\n", err)
		return
	}

	fmt.Printf("Latest Problem: %s\n", p.Title)
	fmt.Printf("CreatorID in DB: %s\n", p.CreatorID)

	// Check user1 ID
	var u models.User
	err = db.Collection("users").FindOne(ctx, bson.M{"username": "user1"}).Decode(&u)
	if err != nil {
		fmt.Printf("Error finding user1: %v\n", err)
		return
	}
	fmt.Printf("User1 ID in DB: %s\n", u.ID)
}
