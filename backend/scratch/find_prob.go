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

	probID := "55555555-5555-5555-5555-555555555555"
	var prob bson.M
	err = db.Collection("problems").FindOne(ctx, bson.M{"id": probID}).Decode(&prob)
	if err != nil {
		fmt.Printf("Problem %s NOT FOUND in MongoDB.\n", probID)
		
		// Search by slug if it was empty?
		err = db.Collection("problems").FindOne(ctx, bson.M{"slug": ""}).Decode(&prob)
		if err == nil {
			fmt.Println("Found a problem with EMPTY SLUG!")
			fmt.Printf("ID: %v, Title: %v\n", prob["id"], prob["title"])
		}
		return
	}

	fmt.Println("Found Problem:")
	fmt.Printf("ID: %v\nSlug: %v\nTitle: %v\n", prob["id"], prob["slug"], prob["title"])
}
