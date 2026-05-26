package main

import (
	"context"
	"fmt"
	"log"
	"strings"

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

	// 1. Find ALL problems missing slugs
	cursor, err := db.Collection("problems").Find(ctx, bson.M{"$or": []bson.M{{"slug": ""}, {"slug": bson.M{"$exists": false}}}})
	if err != nil {
		log.Fatal(err)
	}
	defer cursor.Close(ctx)

	fixedCount := 0
	for cursor.Next(ctx) {
		var p bson.M
		cursor.Decode(&p)
		
		id := p["id"].(string)
		title := p["title"].(string)
		newSlug := strings.ReplaceAll(strings.ToLower(title), " ", "-")
		
		_, err = db.Collection("problems").UpdateOne(ctx, bson.M{"id": id}, bson.M{"$set": bson.M{"slug": newSlug}})
		if err == nil {
			fmt.Printf("Fixed Problem: %s -> %s\n", title, newSlug)
			fixedCount++
		}
	}

	// 2. Fix ALL submissions missing slugs
	cursor, err = db.Collection("submissions").Find(ctx, bson.M{"$or": []bson.M{{"problem_slug": ""}, {"problem_slug": bson.M{"$exists": false}}}})
	if err != nil {
		log.Fatal(err)
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var s bson.M
		cursor.Decode(&s)
		
		subID := s["id"].(string)
		probID := s["problem_id"].(string)
		
		// Find the problem to get its title/slug
		var p bson.M
		err = db.Collection("problems").FindOne(ctx, bson.M{"id": probID}).Decode(&p)
		if err == nil {
			title := p["title"].(string)
			newSlug := strings.ReplaceAll(strings.ToLower(title), " ", "-")
			db.Collection("submissions").UpdateOne(ctx, bson.M{"id": subID}, bson.M{"$set": bson.M{"problem_slug": newSlug}})
		}
	}

	fmt.Printf("\nDone! Automatically repaired %d problems and their submissions.\n", fixedCount)
}
