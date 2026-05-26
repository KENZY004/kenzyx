package main

import (
	"context"
	"encoding/json"
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
		fmt.Printf("Error connecting: %v\n", err)
		return
	}

	db := client.Database("kenyx")
	
	tcJson := `[{"id":"9b5f8c34-9bd9-4605-ba70-57781cb0cdda","problem_id":"11111111-1111-1111-1111-111111111111","input":"4\\n2 7 11 15\\n9","expected":"0 1","is_sample":true,"order_num":0}, {"id":"a5fe4220-f74e-4922-9503-b24c569cb03e","problem_id":"11111111-1111-1111-1111-111111111111","input":"3\\n3 2 4\\n6","expected":"1 2","is_sample":true,"order_num":1}, {"id":"b3e29a80-6fcf-4809-af51-547bc5471d34","problem_id":"11111111-1111-1111-1111-111111111111","input":"2\\n3 3\\n6","expected":"0 1","is_sample":false,"order_num":2}, {"id":"450fcaab-ba41-462a-8bdf-5ae5e297745c","problem_id":"11111111-1111-1111-1111-111111111111","input":"5\\n10 20 30 40 50\\n90","expected":"3 4","is_sample":false,"order_num":3}, {"id":"f292235e-0146-41be-9bf0-c401902e1d44","problem_id":"22222222-2222-2222-2222-222222222222","input":"hello","expected":"olleh","is_sample":true,"order_num":0}, {"id":"f901f213-6648-415a-9a61-ee73fe90458d","problem_id":"22222222-2222-2222-2222-222222222222","input":"Kenyx","expected":"xyneK","is_sample":true,"order_num":1}, {"id":"4f0ee4d4-b8c0-43bf-baf4-241f5aefb98b","problem_id":"22222222-2222-2222-2222-222222222222","input":"Python","expected":"nohtyP","is_sample":false,"order_num":2}, {"id":"8dabb293-0204-4b30-8a49-e30ebb57ecf2","problem_id":"22222222-2222-2222-2222-222222222222","input":"123456789","expected":"987654321","is_sample":false,"order_num":3}, {"id":"d39feafe-c30b-4660-9385-4adebfb536f8","problem_id":"33333333-3333-3333-3333-333333333333","input":"abcabcbb","expected":"3","is_sample":true,"order_num":0}, {"id":"760d967a-c56a-44f2-b656-fec64aec9585","problem_id":"33333333-3333-3333-3333-333333333333","input":"bbbbb","expected":"1","is_sample":true,"order_num":1}, {"id":"5cb91da7-9674-4373-a8ff-1b735c2a70fe","problem_id":"33333333-3333-3333-3333-333333333333","input":"pwwkew","expected":"3","is_sample":false,"order_num":2}, {"id":"90e67134-8535-4f24-99b9-ee05f4a37bd7","problem_id":"33333333-3333-3333-3333-333333333333","input":"","expected":"0","is_sample":false,"order_num":3}, {"id":"d6f3f279-edbe-4815-8ff2-d29006854c86","problem_id":"33333333-3333-3333-3333-333333333333","input":" ","expected":"1","is_sample":false,"order_num":4}, {"id":"f9b74945-e6b1-4b01-a98e-458a0510bda8","problem_id":"33333333-3333-3333-3333-333333333333","input":"dvdf","expected":"3","is_sample":false,"order_num":5}, {"id":"eb346b34-b3e1-4c53-bc4f-ef0b47d141c6","problem_id":"44444444-4444-4444-4444-444444444444","input":"2\\n1 3\\n1\\n2","expected":"2.0","is_sample":true,"order_num":0}, {"id":"ecca2105-add6-4dc3-b855-703d60ddab69","problem_id":"44444444-4444-4444-4444-444444444444","input":"2\\n1 2\\n2\\n3 4","expected":"2.5","is_sample":true,"order_num":1}, {"id":"17264d16-3770-44d6-8bca-f4b65eebe8b0","problem_id":"44444444-4444-4444-4444-444444444444","input":"1\\n0\\n1\\n0","expected":"0.0","is_sample":false,"order_num":2}, {"id":"95ecddf1-71a0-431d-b9c8-e7f12d06e723","problem_id":"55555555-5555-5555-5555-555555555555","input":"2","expected":"2","is_sample":true,"order_num":0}, {"id":"53b369d5-f1b9-4afb-a1b3-8581aaacb70b","problem_id":"55555555-5555-5555-5555-555555555555","input":"3","expected":"3","is_sample":true,"order_num":1}, {"id":"3b6e21bd-cf8c-4a54-9179-3d02fe7791f0","problem_id":"55555555-5555-5555-5555-555555555555","input":"10","expected":"89","is_sample":false,"order_num":2}, {"id":"e0c9ef2d-6d40-4e62-b0e7-f7385614d2e4","problem_id":"77777777-7777-7777-7777-777777777777","input":"4 5\\n11110\\n11010\\n11000\\n00000","expected":"1","is_sample":true,"order_num":0}, {"id":"6d4c3175-6e57-45ce-b823-1d2ffce30e9a","problem_id":"77777777-7777-7777-7777-777777777777","input":"4 5\\n11000\\n11000\\n00100\\n00011","expected":"3","is_sample":true,"order_num":1}]`

	var tcs []models.TestCase
	json.Unmarshal([]byte(tcJson), &tcs)

	// Group by problem_id
	tcMap := make(map[string][]models.TestCase)
	for _, tc := range tcs {
		tcMap[tc.ProblemID] = append(tcMap[tc.ProblemID], tc)
	}

	for probID, cases := range tcMap {
		_, err := db.Collection("problems").UpdateOne(
			ctx, 
			bson.M{"id": probID}, 
			bson.M{"$set": bson.M{"test_cases": cases}},
		)
		if err != nil {
			fmt.Printf("Failed to sync cases for %s: %v\n", probID, err)
		} else {
			fmt.Printf("✅ Synced %d cases for Problem %s\n", len(cases), probID)
		}
	}
	
	fmt.Println("\n🚀 CLOUD SYNC COMPLETE! Kenyx is now fully operational.")
}
