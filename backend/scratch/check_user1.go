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

	email := "kenzninnu409@gmail.com" // User1
	var user struct {
		ID string `bson:"id"`
	}
	err = db.Collection("users").FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		fmt.Printf("User1 (%s) not found.\n", email)
		return
	}
	userID := user.ID

	subCount, _ := db.Collection("submissions").CountDocuments(ctx, bson.M{"user_id": userID})
	fmt.Printf("User1 ID: %s | Total Submissions: %d\n", userID, subCount)
}
