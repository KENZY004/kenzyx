package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	godotenv.Load()
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		uri = "mongodb+srv://minhakenzyom23_db_user:RJB4lGidtiirfnvG@cluster0.rrbuizd.mongodb.net/kenyx?retryWrites=true&w=majority&appName=Cluster0"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		fmt.Printf("Error connecting: %v\n", err)
		return
	}

	db := client.Database("kenyx")

	// Delete problems by "Kenyx Official"
	res, err := db.Collection("problems").DeleteMany(ctx, bson.M{"creator_name": "Kenyx Official"})
	if err != nil {
		fmt.Printf("Deletion failed: %v\n", err)
		return
	}

	fmt.Printf("✅ Deleted %d official/seeded problems.\n", res.DeletedCount)
	fmt.Println("🚀 Cleanup complete! Your dashboard is now 100% yours.")
}
