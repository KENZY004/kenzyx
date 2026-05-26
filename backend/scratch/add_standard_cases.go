package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"kenyx/internal/models"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	godotenv.Load()
	uri := os.Getenv("MONGODB_URI")
	
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	db := client.Database("kenyx")
	
	// 1. Maximum Subarray
	maxSubID := "88888888-8888-8888-8888-888888888888"
	maxSubCases := []models.TestCase{
		{ID: uuid.New().String(), ProblemID: maxSubID, Input: "9\n-2 1 -3 4 -1 2 1 -5 4", Expected: "6", IsSample: true, OrderNum: 0},
		{ID: uuid.New().String(), ProblemID: maxSubID, Input: "1\n1", Expected: "1", IsSample: true, OrderNum: 1},
		{ID: uuid.New().String(), ProblemID: maxSubID, Input: "5\n5 4 -1 7 8", Expected: "23", IsSample: false, OrderNum: 2},
	}

	// 2. Word Search
	wordSearchID := "66666666-6666-6666-6666-666666666666"
	wordSearchCases := []models.TestCase{
		{ID: uuid.New().String(), ProblemID: wordSearchID, Input: "3 4\nA B C E\nS F C S\nA D E E\nABCCED", Expected: "true", IsSample: true, OrderNum: 0},
		{ID: uuid.New().String(), ProblemID: wordSearchID, Input: "3 4\nA B C E\nS F C S\nA D E E\nSEE", Expected: "true", IsSample: true, OrderNum: 1},
		{ID: uuid.New().String(), ProblemID: wordSearchID, Input: "3 4\nA B C E\nS F C S\nA D E E\nABCB", Expected: "false", IsSample: false, OrderNum: 2},
	}

	// Update Atlas
	db.Collection("problems").UpdateOne(ctx, bson.M{"id": maxSubID}, bson.M{"$set": bson.M{"test_cases": maxSubCases}})
	db.Collection("problems").UpdateOne(ctx, bson.M{"id": wordSearchID}, bson.M{"$set": bson.M{"test_cases": wordSearchCases}})
	
	fmt.Println("🚀 Final Sync Complete! All problems are now fully operational.")
}
