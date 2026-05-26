package main

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5"
)

func main() {
	conn, err := pgx.Connect(context.Background(), "postgresql://postgres:postgres@127.0.0.1:5432/postgres?sslmode=disable")
	if err != nil {
		fmt.Printf("Connection failed: %v\n", err)
		return
	}
	defer conn.Close(context.Background())

	_, err = conn.Exec(context.Background(), "CREATE DATABASE kenyx")
	if err != nil {
		fmt.Printf("Failed to create database: %v\n", err)
		return
	}

	fmt.Println("Database 'kenyx' created successfully on port 5432")
}
