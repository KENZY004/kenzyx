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

	email := "kenzninnu409@gmail.com"
	res, err := db.Collection("users").UpdateOne(ctx, bson.M{"email": email}, bson.M{"$set": bson.M{"role": "admin"}})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Matched: %d, Modified: %d\n", res.MatchedCount, res.ModifiedCount)
}
