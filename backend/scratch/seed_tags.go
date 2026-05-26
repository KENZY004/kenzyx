package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"kenyx/internal/models"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	godotenv.Load()
	uri := os.Getenv("MONGODB_URI")
	
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	db := client.Database("kenyx")
	
	tags := []string{"Array", "String", "Hash Table", "Dynamic Programming", "Math", "Sorting", "Greedy", "Depth-First Search", "Binary Search", "Breadth-First Search", "Tree", "Matrix", "Two Pointers", "Binary Tree", "Bit Manipulation", "Stack", "Heap (Priority Queue)", "Graph", "Prefix Sum", "Recursion"}

	for _, t := range tags {
		slug := ""
		for _, c := range t {
			if c >= 'A' && c <= 'Z' {
				slug += string(c + 32)
			} else if c == ' ' {
				slug += "-"
			} else if c == '(' || c == ')' {
				continue
			} else {
				slug += string(c)
			}
		}
		
		tag := models.Tag{ID: slug, Name: t, Slug: slug}
		_, err := db.Collection("tags").UpdateOne(
			ctx, 
			bson.M{"slug": slug}, 
			bson.M{"$set": tag}, 
			options.Update().SetUpsert(true),
		)
		if err != nil {
			fmt.Printf("Failed to seed tag %s: %v\n", t, err)
		}
	}
	
	fmt.Println("🚀 Tags seeded! Create page will now have options.")
}
