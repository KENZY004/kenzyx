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

	userID := "dc74f02a-8ae1-4ade-b52b-648adf3cae18" // User1

	// Move all submissions from "0001-01-01" or empty dates to TODAY
	fmt.Println("Moving lost submissions to today...")
	
	now := time.Now()
	
	// We'll target submissions with very old dates or empty dates
	filter := bson.M{
		"user_id": userID,
		"$or": []bson.M{
			{"created_at": bson.M{"$lt": time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)}},
			{"created_at": 0},
			{"created_at": nil},
		},
	}

	result, err := db.Collection("submissions").UpdateMany(ctx, filter, bson.M{"$set": bson.M{"created_at": now}})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Successfully restored %d submissions to today's date!\n", result.ModifiedCount)
}
