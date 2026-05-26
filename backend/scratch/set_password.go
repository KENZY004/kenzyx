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

	password := "kenz@123"
	email := "kenznajeeb@gmail.com"

	hashed, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	_, err := pool.Exec(context.Background(), "UPDATE users SET password = $1 WHERE email = $2", string(hashed), email)
	if err != nil {
		fmt.Printf("Update failed: %v\n", err)
	} else {
		fmt.Println("✅ Password updated successfully to: kenz@123")
	}
}
