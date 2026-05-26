package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ActivityEntry struct {
	Date  string `json:"date" bson:"_id"`
	Count int    `json:"count" bson:"count"`
}

func main() {
	godotenv.Load()
	uri := os.Getenv("MONGODB_URI")
	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal(err)
	}
	db := client.Database("kenyx")

	// 1. Get User ID for kenz
	var user struct {
		ID string `bson:"id"`
	}
	db.Collection("users").FindOne(context.Background(), bson.M{"username": "kenz"}).Decode(&user)
	
	fmt.Println("Checking activity for:", user.ID)

	// 2. Run the same pipeline as the backend
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"user_id": user.ID,
		}}},
		{{Key: "$project", Value: bson.M{
			"day": bson.M{"$dateToString": bson.M{
				"format": "%Y-%m-%d",
				"date":   "$created_at",
				"timezone": "UTC",
			}},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$day",
			"count": bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
	}

	cursor, err := db.Collection("submissions").Aggregate(context.Background(), pipeline)
	if err != nil {
		log.Fatal(err)
	}
	defer cursor.Close(context.Background())

	var results []ActivityEntry
	if err = cursor.All(context.Background(), &results); err != nil {
		log.Fatal(err)
	}

	out, _ := json.MarshalIndent(results, "", "  ")
	fmt.Println("Activity Data from DB:")
	fmt.Println(string(out))
}
