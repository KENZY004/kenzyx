package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"kenyx/internal/auth"
	"kenyx/internal/db"
	"kenyx/internal/execution"
	"kenyx/internal/handlers"
	"kenyx/internal/mail"
	"kenyx/internal/queue"
	"kenyx/internal/ws"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Init DB
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		log.Fatal("MONGODB_URI is required")
	}

	mongoStore, err := db.NewMongoStore(mongoURI, "kenyx")
	if err != nil {
		log.Fatalf("CRITICAL: Failed to connect to MongoDB: %v", err)
	}
	database := mongoStore

	// ─── Bootstrap ───
	// Ensure the user's requested admin account exists
	if err := database.BootstrapAdmin("kenznajeeb@gmail.com", "kenz", "kenz@123"); err != nil {
		log.Printf("Warning: BootstrapAdmin failed: %v", err)
	}

	// Init Docker executor
	executor := execution.NewDockerExecutor()

	// Init Redis queue
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "127.0.0.1:6379"
	}
	queueClient := queue.NewClient(redisAddr)

	// Init WebSocket hub
	hub := ws.NewHub()
	go hub.Run()

	// Init JWT
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "kenyx-dev-secret-change-in-production"
	}
	authService := auth.NewService(jwtSecret)

	// Init Mailer
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}
	var mailer mail.Mailer
	if os.Getenv("SMTP_EMAIL") != "" && os.Getenv("SMTP_PASSWORD") != "" {
		log.Println("SMTP credentials found, using Google Mailer")
		mailer = &mail.GoogleMailer{
			BaseURL:  appURL,
			Email:    os.Getenv("SMTP_EMAIL"),
			Password: os.Getenv("SMTP_PASSWORD"),
		}
	} else {
		log.Println("No SMTP credentials found, using Console Mailer")
		mailer = &mail.ConsoleMailer{BaseURL: appURL}
	}

	// Init handlers
	h := handlers.New(database, queueClient, hub, authService, executor, mailer)

	// Gin router
	if os.Getenv("GIN_MODE") != "" {
		gin.SetMode(os.Getenv("GIN_MODE"))
	}

	r := gin.Default()

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "https://kenyx.dev"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "kenyx-api"})
	})

	// API v1
	api := r.Group("/api/v1")

	// Auth routes (public)
	api.POST("/auth/signup", h.Signup)
	api.POST("/auth/login", h.Login)
	api.POST("/auth/google", h.GoogleLogin)
	api.POST("/auth/refresh", h.RefreshToken)
	api.GET("/auth/verify", h.VerifyEmail)

	// Problems (public but aware of user)
	aware := api.Group("")
	aware.Use(authService.OptionalMiddleware())
	{
		aware.GET("/problems", h.ListProblems)
		aware.GET("/problems/daily", h.GetDailyChallenge)
		aware.GET("/problems/trending", h.GetTrendingProblems)
		aware.GET("/problems/:slug", h.GetProblem)
		aware.GET("/problems/:slug/stats", h.GetProblemStats)
		aware.POST("/problems/:slug/run", h.RunCode)
		aware.GET("/tags", h.ListTags)
	}

	// Leaderboard (public)
	api.GET("/leaderboard", h.GetLeaderboard)

	// Users (public profiles)
	api.GET("/users/:username", h.GetUserProfile)

	// Protected routes
	protected := api.Group("")
	protected.Use(authService.Middleware())
	{
		// Auth Actions
		protected.POST("/auth/verify/resend", h.ResendVerification)

		// Submissions
		protected.POST("/problems/:slug/submit", h.SubmitCode)
		protected.GET("/submissions/:id", h.GetSubmission)
		protected.GET("/submissions/:id/status", h.GetSubmissionStatus)
		protected.GET("/problems/:slug/submissions", h.GetMySubmissions)

		// Problem interactions
		protected.POST("/problems/:slug/like", h.LikeProblem)
		protected.POST("/problems/:slug/rate", h.RateProblem)

		// Problem creation (community)
		protected.POST("/problems", h.CreateProblem)
		protected.PUT("/problems/:slug", h.UpdateProblem)
		protected.DELETE("/problems/:slug", h.DeleteProblem)

		// User dashboard
		protected.GET("/me", h.GetMe)
		protected.PUT("/me", h.UpdateMe)
		protected.GET("/me/stats", h.GetMyStats)
		protected.GET("/me/submissions", h.GetMyAllSubmissions)
		protected.GET("/me/problems", h.GetMyCreatedProblems)
		protected.GET("/me/activity", h.GetMyActivity)

		// Notifications
		protected.GET("/me/notifications", h.GetMyNotifications)
		protected.POST("/me/notifications/:id/read", h.MarkNotificationRead)
		protected.POST("/me/notifications/read-all", h.MarkAllNotificationsRead)

		// Battle mode
		protected.POST("/battles", h.CreateBattle)
		protected.POST("/battles/:id/join", h.JoinBattle)
		protected.GET("/battles/active", h.GetActiveBattles)
	}

	// Admin routes
	admin := api.Group("/admin")
	admin.Use(authService.Middleware(), authService.RequireAdmin())
	{
		admin.GET("/problems/pending", h.GetPendingProblems)
		admin.POST("/problems/:slug/approve", h.ApproveProblem)
		admin.POST("/problems/:slug/reject", h.RejectProblem)
		admin.GET("/stats", h.GetAdminStats)
		admin.GET("/users", h.ListUsers)
		admin.DELETE("/users/:id", h.DeleteUser)
		admin.PATCH("/users/:id/role", h.UpdateUserRole)
		admin.PATCH("/users/:id/ban", h.BanUser)
	}

	// Internal routes (used by worker — must be at root, NOT under /api/v1)
	r.POST("/internal/broadcast", h.InternalBroadcast)

	// WebSocket
	r.GET("/ws", hub.ServeWS(authService))

	// Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		log.Printf("🚀 Kenyx API server starting on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("CRITICAL: Server failed to start: %v", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}
	log.Println("Server exited")
}
