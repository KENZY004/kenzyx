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

	count, err := db.Collection("problems").CountDocuments(ctx, bson.M{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Total problems: %d\n", count)

	cursor, err := db.Collection("problems").Find(ctx, bson.M{})
	if err != nil {
		log.Fatal(err)
	}
	var results []bson.M
	cursor.All(ctx, &results)
	for _, res := range results {
		fmt.Printf("Problem: %v, Slug: [%v], Status: %v\n", res["title"], res["slug"], res["status"])
	}
}
