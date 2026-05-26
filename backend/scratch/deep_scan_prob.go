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

	var res bson.M
	err = db.Collection("problems").FindOne(ctx, bson.M{"slug": "trapping-rain-water"}).Decode(&res)
	if err != nil {
		fmt.Printf("Error finding problem: %v\n", err)
		return
	}

	fmt.Printf("RAW DATA: %+v\n", res)
}
