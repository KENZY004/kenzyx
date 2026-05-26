package main

import (
	"context"
	"fmt"
	"log"
	"sort"
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

	email := "kenznajeeb@gmail.com"
	var user struct {
		ID string `bson:"id"`
	}
	err = db.Collection("users").FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		log.Fatal("User not found")
	}
	userID := user.ID

	cursor, _ := db.Collection("submissions").Find(ctx, bson.M{"user_id": userID, "status": "accepted"})
	
	dates := make(map[string]bool)
	for cursor.Next(ctx) {
		var sub struct {
			CreatedAt time.Time `bson:"created_at"`
		}
		cursor.Decode(&sub)
		dates[sub.CreatedAt.UTC().Format("2006-01-02")] = true
	}

	uniqueDates := []string{}
	for d := range dates {
		uniqueDates = append(uniqueDates, d)
	}
	sort.Strings(uniqueDates)

	fmt.Printf("Total unique days with submissions: %d\n", len(uniqueDates))
	if len(uniqueDates) > 0 {
		fmt.Printf("First activity: %s\n", uniqueDates[0])
		fmt.Printf("Last activity:  %s\n", uniqueDates[len(uniqueDates)-1])
		
		fmt.Println("\nAnalyzing Gaps:")
		for i := 0; i < len(uniqueDates)-1; i++ {
			d1, _ := time.Parse("2006-01-02", uniqueDates[i])
			d2, _ := time.Parse("2006-01-02", uniqueDates[i+1])
			diff := d2.Sub(d1).Hours()
			if diff > 24 {
				fmt.Printf("GAP FOUND: %s to %s (%d days missing)\n", uniqueDates[i], uniqueDates[i+1], int(diff/24)-1)
			}
		}
	}
}
