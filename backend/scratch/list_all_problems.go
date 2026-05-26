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

	cursor, _ := db.Collection("problems").Find(context.Background(), bson.M{})
	defer cursor.Close(context.Background())

	fmt.Println("All Problems in DB:")
	for cursor.Next(context.Background()) {
		var p struct {
			Title      string `bson:"title"`
			Difficulty string `bson:"difficulty"`
			Points     int    `bson:"points"`
		}
		cursor.Decode(&p)
		fmt.Printf("- %s [%s] -> %d pts\n", p.Title, p.Difficulty, p.Points)
	}
}
