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

	userID := "dc74f02a-8ae1-4ade-b52b-648adf3cae18" // USER1

	fmt.Printf("Deep scan for User1 (ID: %s)...\n", userID)
	
	cursor, _ := db.Collection("submissions").Find(ctx, bson.M{"user_id": userID})
	fmt.Println("All Submissions for User1:")
	for cursor.Next(ctx) {
		var sub struct {
			ID string `bson:"id"`
			Slug string `bson:"problem_slug"`
			Status string `bson:"status"`
		}
		cursor.Decode(&sub)
		fmt.Printf(" - SubID: %s | Slug: %s | Status: %s\n", sub.ID, sub.Slug, sub.Status)
	}
}
