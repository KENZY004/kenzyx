package main

import (
	"context"
	"fmt"
	"log"
	"time"

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

	userID := "dc74f02a-8ae1-4ade-b52b-648adf3cae18" // User1 ID

	cursor, _ := db.Collection("submissions").Find(ctx, bson.M{"user_id": userID})
	
	fmt.Println("User1 Precise Submission Dates (UTC):")
	for cursor.Next(ctx) {
		var sub struct {
			ProblemSlug string `bson:"problem_slug"`
			CreatedAt time.Time `bson:"created_at"`
		}
		cursor.Decode(&sub)
		fmt.Printf("- %s: %s\n", sub.ProblemSlug, sub.CreatedAt.Format("2006-01-02 15:04:05"))
	}
}
