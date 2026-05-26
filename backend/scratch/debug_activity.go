package main

import (
	"context"
	"fmt"
	"log"
	"time"

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

	email := "kenznajeeb@gmail.com" // Admin email
	var user struct {
		ID string `bson:"id"`
	}
	err = db.Collection("users").FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		log.Fatal("User not found")
	}
	userID := user.ID
	fmt.Printf("Debugging activity for User ID: %s\n", userID)

	// 1. Inspect a few submissions
	cursor, _ := db.Collection("submissions").Find(ctx, bson.M{"user_id": userID}, options.Find().SetLimit(5))
	for cursor.Next(ctx) {
		var raw bson.M
		cursor.Decode(&raw)
		createdAt := raw["created_at"]
		fmt.Printf("Submission ID: %v, CreatedAt Type: %T, Value: %v\n", raw["id"], createdAt, createdAt)
	}

	// 2. Test the aggregation pipeline
	threeSixtyFiveDaysAgo := time.Now().AddDate(-1, 0, 0)
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"user_id":    userID,
			"created_at": bson.M{"$gte": threeSixtyFiveDaysAgo},
		}}},
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
		{{Key: "$group", Value: bson.M{
			"_id":   "$day",
			"count": bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
	}

	aggCursor, err := db.Collection("submissions").Aggregate(ctx, pipeline)
	if err != nil {
		log.Fatalf("Aggregation failed: %v", err)
	}
	
	fmt.Println("\nAggregation Results:")
	count := 0
	for aggCursor.Next(ctx) {
		var res bson.M
		aggCursor.Decode(&res)
		fmt.Printf("Day: %v, Count: %v\n", res["_id"], res["count"])
		count++
	}
	fmt.Printf("Total days with activity: %d\n", count)
}
