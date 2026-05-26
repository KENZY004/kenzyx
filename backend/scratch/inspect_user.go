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
	uri := "mongodb+srv://minhakenzyom23_db_user:RJB4lGidtiirfnvG@cluster0.rrbuizd.mongodb.net/kenyx?retryWrites=true&w=majority&appName=Cluster0"
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal(err)
	}

	db := client.Database("kenyx")

	// 1. List all users
	cursor, err := db.Collection("users").Find(ctx, bson.M{})
	if err == nil {
		var users []bson.M
		cursor.All(ctx, &users)
		fmt.Printf("Users in DB (%d):\n", len(users))
		for _, u := range users {
			fmt.Printf("- Username: %v, ID: %v\n", u["username"], u["id"])
		}
	}

	// 2. Check submissions and their user_ids
	cursor, err = db.Collection("submissions").Find(ctx, bson.M{}, options.Find().SetLimit(5).SetSort(bson.M{"created_at": -1}))
	if err == nil {
		var subs []bson.M
		cursor.All(ctx, &subs)
		fmt.Printf("\nLatest 5 Submissions:\n")
		for _, s := range subs {
			fmt.Printf("- SubID: %v, UserID: %v, Problem: %v\n", s["id"], s["user_id"], s["problem_slug"])
		}
	}
}
