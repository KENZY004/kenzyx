package main

import (
	"context"
	"fmt"
	"log"
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
	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal(err)
	}
	db := client.Database("kenyx")

	// 1. Get User ID for kenz
	var user struct {
		ID string `bson:"id"`
	}
	err = db.Collection("users").FindOne(context.Background(), bson.M{"username": "kenz"}).Decode(&user)
	if err != nil {
		log.Fatal("User not found:", err)
	}
	fmt.Println("User ID for kenz:", user.ID)

	// 2. Get Submissions for today
	today := time.Now().UTC().AddDate(0, 0, -1) // check last 24h
	cursor, err := db.Collection("submissions").Find(context.Background(), bson.M{
		"user_id": user.ID,
		"created_at": bson.M{"$gte": today},
	})
	if err != nil {
		log.Fatal(err)
	}
	defer cursor.Close(context.Background())

	fmt.Println("\nRecent Submissions:")
	for cursor.Next(context.Background()) {
		var sub struct {
			ID        string    `bson:"id"`
			Slug      string    `bson:"problem_slug"`
			Status    string    `bson:"status"`
			CreatedAt time.Time `bson:"created_at"`
		}
		cursor.Decode(&sub)
		fmt.Printf("- %s | %s | %s | %s\n", sub.CreatedAt.Format(time.RFC3339), sub.Slug, sub.Status, sub.ID)
	}
}
