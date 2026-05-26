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
	
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	db := client.Database("kenyx")
	var p models.Problem
	err = db.Collection("problems").FindOne(ctx, bson.M{"slug": "maximum-subarray"}).Decode(&p)
	if err != nil {
		fmt.Printf("Error finding problem: %v\n", err)
		return
	}

	fmt.Printf("Problem: %s\n", p.Title)
	fmt.Printf("Input Format: %s\n", p.InputFormat)
	fmt.Printf("Output Format: %s\n", p.OutputFormat)
	fmt.Printf("Test Cases Count: %d\n", len(p.TestCases))
	
	for i, tc := range p.TestCases {
		fmt.Printf("Case %d: Sample=%v, Input=%s\n", i+1, tc.IsSample, tc.Input)
	}
}
