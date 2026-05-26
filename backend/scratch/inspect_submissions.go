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

	email := "kenznajeeb@gmail.com"
	var user struct {
		ID string `bson:"id"`
	}
	err = db.Collection("users").FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		log.Fatal("User not found")
	}
	userID := user.ID

	// Inspect some random old submissions
	cursor, _ := db.Collection("submissions").Find(ctx, bson.M{"user_id": userID}, options.Find().SetLimit(20))
	
	fmt.Println("Inspecting first 20 submissions:")
	for cursor.Next(ctx) {
		var sub struct {
			ID string `bson:"id"`
			ProblemSlug string `bson:"problem_slug"`
			Status string `bson:"status"`
			CreatedAt interface{} `bson:"created_at"`
		}
		cursor.Decode(&sub)
		fmt.Printf("Sub: %s | Problem: %s | Status: %s | CreatedAt: %v\n", sub.ID, sub.ProblemSlug, sub.Status, sub.CreatedAt)
	}
}
