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

	fmt.Println("--- USERS ---")
	cursor, _ := db.Collection("users").Find(ctx, bson.M{})
	for cursor.Next(ctx) {
		var u struct {
			ID string `bson:"id"`
			Username string `bson:"username"`
			Email string `bson:"email"`
		}
		cursor.Decode(&u)
		fmt.Printf("User: %s | Email: %s | ID: %s\n", u.Username, u.Email, u.ID)
	}

	fmt.Println("\n--- USER STATS ---")
	cursor2, _ := db.Collection("user_stats").Find(ctx, bson.M{})
	for cursor2.Next(ctx) {
		var s struct {
			UserID string `bson:"user_id"`
			Score int `bson:"total_score"`
			Solved int `bson:"problems_solved"`
			E int `bson:"easy_solved"`
			M int `bson:"medium_solved"`
			H int `bson:"hard_solved"`
		}
		cursor2.Decode(&s)
		fmt.Printf("Stats for %s: Score=%d, Solved=%d (E:%d, M:%d, H:%d)\n", s.UserID, s.Score, s.Solved, s.E, s.M, s.H)
	}
}
