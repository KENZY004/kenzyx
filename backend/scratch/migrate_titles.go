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

	// Find ALL submissions missing problem_title
	cursor, err := db.Collection("submissions").Find(ctx, bson.M{"$or": []bson.M{{"problem_title": ""}, {"problem_title": bson.M{"$exists": false}}}})
	if err != nil {
		log.Fatal(err)
	}
	defer cursor.Close(ctx)

	fixedCount := 0
	for cursor.Next(ctx) {
		var s bson.M
		cursor.Decode(&s)
		
		id := s["id"].(string)
		probID := s["problem_id"].(string)
		
		// Find the problem to get its ACTUAL title
		var p bson.M
		err = db.Collection("problems").FindOne(ctx, bson.M{"id": probID}).Decode(&p)
		if err == nil {
			title := p["title"].(string)
			db.Collection("submissions").UpdateOne(ctx, bson.M{"id": id}, bson.M{"$set": bson.M{"problem_title": title}})
			fmt.Printf("Migration: Linked Submission %s to Problem '%s'\n", id, title)
			fixedCount++
		} else {
			fmt.Printf("Warning: Problem ID %s not found for submission %s\n", probID, id)
		}
	}

	fmt.Printf("\nPermanent Migration Complete! Fixed %d records.\n", fixedCount)
}
