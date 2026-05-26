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

	// Get the very last submission
	var sub bson.M
	err = db.Collection("submissions").FindOne(ctx, bson.M{}, options.FindOne().SetSort(bson.M{"created_at": -1})).Decode(&sub)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Full Submission Record Detail:")
	for k, v := range sub {
		fmt.Printf("%s: %v (%T)\n", k, v, v)
	}
}
