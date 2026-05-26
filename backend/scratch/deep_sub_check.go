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

	// Find the submission with runtime 2186
	var sub bson.M
	err = db.Collection("submissions").FindOne(ctx, bson.M{"runtime_ms": 2186}).Decode(&sub)
	if err != nil {
		fmt.Println("Submission not found with runtime 2186.")
		
		// Fallback: check the latest
		err = db.Collection("submissions").FindOne(ctx, bson.M{}, options.FindOne().SetSort(bson.M{"created_at": -1})).Decode(&sub)
		if err != nil {
			log.Fatal(err)
		}
	}

	fmt.Println("Submission Details:")
	for k, v := range sub {
		fmt.Printf("%s: %v (%T)\n", k, v, v)
	}
	
	probID := sub["problem_id"].(string)
	var prob bson.M
	err = db.Collection("problems").FindOne(ctx, bson.M{"id": probID}).Decode(&prob)
	if err == nil {
		fmt.Println("\nLinked Problem Details:")
		for k, v := range prob {
			fmt.Printf("%s: %v (%T)\n", k, v, v)
		}
	} else {
		fmt.Printf("\nProblem with ID %s NOT FOUND!\n", probID)
	}
}
