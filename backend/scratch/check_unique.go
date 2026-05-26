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

	var user struct {
		ID string `bson:"id"`
	}
	db.Collection("users").FindOne(ctx, bson.M{"email": "kenznajeeb@gmail.com"}).Decode(&user)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"user_id": user.ID, "status": "accepted"}}},
		{{Key: "$group", Value: bson.M{"_id": "$problem_slug", "count": bson.M{"$sum": 1}}}},
	}

	cursor, _ := db.Collection("submissions").Aggregate(ctx, pipeline)
	fmt.Println("Unique Problems Solved (Accepted):")
	for cursor.Next(ctx) {
		var res struct {
			ID string `bson:"_id"`
			Count int `bson:"count"`
		}
		cursor.Decode(&res)
		fmt.Printf(" - %s: %d times\n", res.ID, res.Count)
	}
}
