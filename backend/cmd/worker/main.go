package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"kenyx/internal/db"
	"kenyx/internal/execution"
	"kenyx/internal/queue"
	"kenyx/internal/ws"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		// Fallback for cases where worker is run from subdirectories
		godotenv.Load("../../.env")
	}

	// Init DB
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		log.Fatal("Worker: MONGODB_URI is required")
	}

	mongoStore, err := db.NewMongoStore(mongoURI, "kenyx")
	if err != nil {
		log.Fatalf("Worker CRITICAL: Failed to connect to MongoDB: %v", err)
	}
	database := mongoStore

	// Init Redis
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "127.0.0.1:6379"
	}

	// Init WebSocket hub client (push results back)
	wsURL := os.Getenv("WS_HUB_URL")
	if wsURL == "" {
		wsURL = "http://localhost:8080"
	}
	wsClient := ws.NewHubClient(wsURL)

	// Init Docker executor
	executor := execution.NewDockerExecutor()

	// Init and start worker
	worker := queue.NewWorker(redisAddr, database, executor, wsClient)

	log.Println("🔧 Kenyx Worker starting...")

	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		if err := worker.Start(ctx); err != nil {
			log.Printf("Worker error: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Worker shutting down...")
	cancel()
	log.Println("Worker exited")
}
