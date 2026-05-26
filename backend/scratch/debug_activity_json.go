package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	godotenv.Load()
	uri := os.Getenv("MONGODB_URI")
	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal(err)
	}
	db := client.Database("kenyx")

	var user struct {
		ID string `bson:"id"`
	}
	db.Collection("users").FindOne(context.Background(), bson.M{"username": "kenz"}).Decode(&user)

	// Simulate the exact logic from handlers.go
	threeSixtySixDaysAgo := time.Now().UTC().AddDate(-1, 0, -1)
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"user_id": user.ID,
			"created_at": bson.M{"$gte": threeSixtySixDaysAgo},
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

	cursor, _ := db.Collection("submissions").Aggregate(context.Background(), pipeline)
	
	type ActivityEntry struct {
		Date  string `json:"date"`
		Count int    `json:"count"`
	}
	var results []ActivityEntry
	for cursor.Next(context.Background()) {
		var raw struct {
			ID    string `bson:"_id"`
			Count int    `bson:"count"`
		}
		cursor.Decode(&raw)
		results = append(results, ActivityEntry{
			Date:  raw.ID,
			Count: raw.Count,
		})
	}

	out, _ := json.MarshalIndent(results, "", "  ")
	fmt.Println(string(out))
}
