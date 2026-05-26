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

	email := "kenznajeeb@gmail.com" // Admin account
	var user struct {
		ID string `bson:"id"`
	}
	err = db.Collection("users").FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		log.Fatal("User not found")
	}
	userID := user.ID

	// 1. Get all accepted submissions
	cursor, _ := db.Collection("submissions").Find(ctx, bson.M{"user_id": userID, "status": "accepted"})
	
	dates := make(map[string]bool)
	for cursor.Next(ctx) {
		var sub struct {
			CreatedAt time.Time `bson:"created_at"`
		}
		cursor.Decode(&sub)
		// Normalize to local day (or UTC)
		dateStr := sub.CreatedAt.UTC().Format("2006-01-02")
		dates[dateStr] = true
	}

	uniqueDates := []string{}
	for d := range dates {
		uniqueDates = append(uniqueDates, d)
	}
	sort.Strings(uniqueDates)

	if len(uniqueDates) == 0 {
		fmt.Println("No activity found.")
		return
	}

	// 2. Calculate current streak
	streak := 0
	lastDate, _ := time.Parse("2006-01-02", uniqueDates[len(uniqueDates)-1])
	today := time.Now().UTC().Truncate(24 * time.Hour)
	
	// If the last solve was not today or yesterday, streak is broken
	diff := today.Sub(lastDate.Truncate(24 * time.Hour)).Hours()
	if diff > 24 {
		streak = 0
		fmt.Printf("Streak broken. Last solve was %v, Today is %v (Diff: %v hours)\n", lastDate.Format("2006-01-02"), today.Format("2006-01-02"), diff)
	} else {
		// Count backwards
		streak = 1
		for i := len(uniqueDates) - 2; i >= 0; i-- {
			current, _ := time.Parse("2006-01-02", uniqueDates[i+1])
			prev, _ := time.Parse("2006-01-02", uniqueDates[i])
			
			if current.Sub(prev).Hours() <= 24 {
				streak++
			} else {
				break
			}
		}
	}

	// 3. Update user
	update := bson.M{
		"$set": bson.M{
			"streak":      streak,
			"last_solved": lastDate,
		},
	}
	db.Collection("users").UpdateOne(ctx, bson.M{"id": userID}, update)

	fmt.Printf("SUCCESS! User Streak recalculated to: %d days (Last solved: %s)\n", streak, uniqueDates[len(uniqueDates)-1])
}
