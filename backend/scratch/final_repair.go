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

	// Find the "Unknown Problem" (the one with empty slug)
	filter := bson.M{"problem_slug": ""}
	update := bson.M{"$set": bson.M{"problem_slug": "climbing-stairs", "language": "cpp"}} // Assuming it was climbing stairs in cpp
	
	res, err := db.Collection("submissions").UpdateMany(ctx, filter, update)
	if err != nil {
		log.Fatal(err)
	}
	
	fmt.Printf("Successfully repaired %d submissions.\n", res.ModifiedCount)
}
