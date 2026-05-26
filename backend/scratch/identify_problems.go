package main

import (
	"context"
	"fmt"
	"log"
	"os"

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

	ids := []string{
		"35d09d3a-2050-4300-9b32-09b4a7233790",
		"eca051d0-6b0f-439a-813f-e4b711ee0ee6",
		"d43c4ac8-33f0-4bbc-873a-b994141c9c57",
	}

	for _, id := range ids {
		var prob struct {
			Title      string `bson:"title"`
			Difficulty string `bson:"difficulty"`
		}
		err = db.Collection("problems").FindOne(context.Background(), bson.M{"id": id}).Decode(&prob)
		if err != nil {
			fmt.Printf("Problem ID %s NOT FOUND\n", id)
			continue
		}
		fmt.Printf("ID %s: %s [%s]\n", id, prob.Title, prob.Difficulty)
	}
}
