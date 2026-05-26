package main

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	godotenv.Load()
	dbURL := os.Getenv("DATABASE_URL")
	pool, _ := pgxpool.New(context.Background(), dbURL)
	defer pool.Close()

	email := "kenznajeeb@gmail.com"
	passwordToTest := "kenz@123"

	var dbEmail, dbPassword string
	err := pool.QueryRow(context.Background(), "SELECT email, password FROM users WHERE email = $1", email).Scan(&dbEmail, &dbPassword)
	if err != nil {
		fmt.Printf("❌ Could not find user with email [%s]: %v\n", email, err)
		return
	}

	fmt.Printf("🔍 Found user: [%s]\n", dbEmail)
	
	err = bcrypt.CompareHashAndPassword([]byte(dbPassword), []byte(passwordToTest))
	if err != nil {
		fmt.Printf("❌ Password check FAILED for [%s]: %v\n", passwordToTest, err)
	} else {
		fmt.Printf("✅ Password check PASSED for [%s]\n", passwordToTest)
	}
}
