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

	// Set language to "python" for any submission that has it empty
	filter := bson.M{"language": ""}
	update := bson.M{"$set": bson.M{"language": "python"}}
	
	res, err := db.Collection("submissions").UpdateMany(ctx, filter, update)
	if err != nil {
		log.Fatal(err)
	}
	
	fmt.Printf("Successfully repaired %d submissions by setting language to 'python'.\n", res.ModifiedCount)
}
