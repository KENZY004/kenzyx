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

	userID := "dc74f02a-8ae1-4ade-b52b-648adf3cae18" // User1

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"user_id": userID}}},
		{{Key: "$project", Value: bson.M{
			"day": bson.M{"$dateToString": bson.M{
				"format": "%Y-%m-%d", 
				"date": bson.M{"$cond": bson.M{
					"if":   bson.M{"$isNumber": "$created_at"},
					"then": bson.M{"$toDate": "$created_at"},
					"else": "$created_at",
				}},
			}},
		}}},
		{{Key: "$group", Value: bson.M{"_id": "$day", "count": bson.M{"$sum": 1}}}},
	}

	cursor, _ := db.Collection("submissions").Aggregate(ctx, pipeline)
	fmt.Println("--- ACTUAL ACTIVITY DATA FROM SERVER ---")
	for cursor.Next(ctx) {
		var res struct {
			ID string `bson:"_id"`
			Count int `bson:"count"`
		}
		cursor.Decode(&res)
		fmt.Printf("Date: '%s' | Count: %d\n", res.ID, res.Count)
	}
}
