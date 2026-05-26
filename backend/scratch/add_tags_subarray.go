package main

import (
	"context"
	"fmt"
	"log"

	"kenyx/internal/models"

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

	tags := []models.Tag{
		{Name: "Array", Slug: "array"},
		{Name: "Dynamic Programming", Slug: "dynamic-programming"},
	}

	res, err := db.Collection("problems").UpdateOne(
		ctx,
		bson.M{"slug": "maximum-subarray-sum-with-one-deletion"},
		bson.M{"$set": bson.M{"tags": tags}},
	)

	if err != nil {
		fmt.Printf("Update failed: %v\n", err)
	} else if res.MatchedCount == 0 {
		fmt.Println("Problem not found.")
	} else {
		fmt.Printf("✅ Tags added to 'Maximum Subarray Sum with One Deletion'!\n")
	}
}
