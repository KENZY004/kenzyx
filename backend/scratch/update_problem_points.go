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

	// Update Easy
	resEasy, _ := db.Collection("problems").UpdateMany(context.Background(), 
		bson.M{"difficulty": "easy"}, 
		bson.M{"$set": bson.M{"points": 10}})
	
	// Update Medium
	resMedium, _ := db.Collection("problems").UpdateMany(context.Background(), 
		bson.M{"difficulty": "medium"}, 
		bson.M{"$set": bson.M{"points": 20}})
	
	// Update Hard
	resHard, _ := db.Collection("problems").UpdateMany(context.Background(), 
		bson.M{"difficulty": "hard"}, 
		bson.M{"$set": bson.M{"points": 30}})

	fmt.Printf("Points updated:\n- Easy: %d problems (10 pts)\n- Medium: %d problems (20 pts)\n- Hard: %d problems (30 pts)\n", 
		resEasy.ModifiedCount, resMedium.ModifiedCount, resHard.ModifiedCount)
}
