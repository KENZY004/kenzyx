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

	var stats map[string]interface{}
	err = db.Collection("user_stats").FindOne(context.Background(), bson.M{"user_id": user.ID}).Decode(&stats)
	if err != nil {
		log.Fatal(err)
	}

	out, _ := json.MarshalIndent(stats, "", "  ")
	fmt.Println("User Stats for kenz:")
	fmt.Println(string(out))
}
