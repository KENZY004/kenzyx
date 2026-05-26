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

	// 1. Fix the problem itself
	probID := "55555555-5555-5555-5555-555555555555"
	res, _ := db.Collection("problems").UpdateOne(ctx, bson.M{"id": probID}, bson.M{"$set": bson.M{"slug": "climbing-stairs"}})
	if res.ModifiedCount > 0 {
		fmt.Println("Fixed Problem slug: climbing-stairs")
	}

	// 2. Fix the submission
	subID := "8556d885-e9c4-4573-83a5-9499c2ea54b0"
	res, _ = db.Collection("submissions").UpdateOne(ctx, bson.M{"id": subID}, bson.M{"$set": bson.M{"problem_slug": "climbing-stairs", "language": "python"}})
	if res.ModifiedCount > 0 {
		fmt.Println("Fixed Submission slug and language.")
	}
}
