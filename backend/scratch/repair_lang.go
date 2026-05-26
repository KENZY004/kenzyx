package main

import (
	"context"
	"fmt"
	"log"
	"strings"

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

	// Find submissions missing language
	cursor, err := db.Collection("submissions").Find(ctx, bson.M{"$or": []bson.M{{"language": ""}, {"language": bson.M{"$exists": false}}}})
	if err != nil {
		log.Fatal(err)
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var s bson.M
		cursor.Decode(&s)
		
		id := s["id"].(string)
		
		rawCode, ok := s["code"]
		if !ok || rawCode == nil {
			fmt.Printf("Skipping Submission %s: No code found\n", id)
			continue
		}
		
		code, ok := rawCode.(string)
		if !ok {
			fmt.Printf("Skipping Submission %s: Code is not a string\n", id)
			continue
		}
		
		// Guess language from code content
		lang := "cpp" // Default
		if strings.Contains(code, "def ") || strings.Contains(code, "import ") && !strings.Contains(code, "#include") {
			if strings.Contains(code, ":") {
				lang = "python"
			}
		}
		if strings.Contains(code, "public class") || strings.Contains(code, "System.out.print") {
			lang = "java"
		}
		if strings.Contains(code, "fmt.Print") || strings.Contains(code, "package main") {
			lang = "go"
		}

		db.Collection("submissions").UpdateOne(ctx, bson.M{"id": id}, bson.M{"$set": bson.M{"language": lang}})
		fmt.Printf("Fixed Language for Submission %s -> %s\n", id, lang)
	}

	fmt.Println("Done!")
}
