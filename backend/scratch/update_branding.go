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

	// Update all problems created by 'kenz' (the admin) to 'Kenyx Official'
	res, err := db.Collection("problems").UpdateMany(
		ctx, 
		bson.M{"creator_name": "kenz"}, 
		bson.M{"$set": bson.M{"creator_name": "Kenyx Official"}},
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Updated %d existing problems to 'Kenyx Official'.\n", res.ModifiedCount)
}
