package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"kenyx/internal/auth"
	"kenyx/internal/execution"
	"kenyx/internal/mail"
	"kenyx/internal/models"
	"kenyx/internal/queue"
	"kenyx/internal/ws"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// Store defines the data access layer interface.
type Store interface {
	// Users
	GetUserByEmail(email string) (*models.User, error)
	GetUserByID(id string) (*models.User, error)
	GetUserByUsername(username string) (*models.User, error)
	CreateUser(req *models.SignupRequest, hashedPassword string, isVerified bool) (*models.User, error)
	VerifyUserByToken(token string) (string, error)
	UpdateVerificationToken(userID, tokenHash string, expiresAt time.Time) error
	CreateAuditLog(log models.AuditLog) error
	GetUserStats(userID string) (*models.UserStats, error)
	UpdateUser(userID string, req *models.UpdateProfileRequest) error
	GetActivityHeatmap(userID string, timezone string) ([]models.ActivityEntry, error)

	// Problems
	ListProblems(difficulty, tag, status, userID string, page, pageSize int) ([]*models.ProblemListItem, int, error)
	GetProblemBySlug(slug string) (*models.Problem, error)
	GetProblemByID(id string) (*models.Problem, error)
	GetTestCases(problemID string) ([]*models.TestCase, error)
	GetDailyChallenge() (*models.Problem, error)
	GetTrendingProblems(limit int) ([]*models.Problem, error)
	CreateProblem(req *models.CreateProblemRequest, creatorID, creatorName string, status models.ProblemStatus) (*models.Problem, error)
	UpdateProblem(slug string, req *models.CreateProblemRequest) error
	DeleteProblem(slug string) error
	ApproveProblem(slug string) error
	RejectProblem(slug, note string) error
	GetPendingProblems() ([]*models.Problem, error)
	GetUserProblems(userID string) ([]*models.Problem, error)
	LikeProblem(userID, problemID string) (bool, error)
	IncrementProblemSubmissions(problemID string) error

	// Submissions
	CreateSubmission(sub *models.Submission) error
	UpdateSubmission(sub *models.Submission) error
	GetSubmissionByID(id string) (*models.Submission, error)
	GetLatestSubmission(userID, problemID string) (*models.Submission, error)
	GetUserSubmissions(userID, problemID string) ([]*models.Submission, error)

	// Leaderboard
	GetLeaderboard(limit int) ([]*models.LeaderboardEntry, error)

	// Tags
	ListTags() ([]*models.Tag, error)

	// Notifications
	GetMyNotifications(userID string) ([]*models.Notification, error)
	MarkNotificationRead(id, userID string) error
	MarkAllNotificationsRead(userID string) error

	// Battles
	CreateBattle(playerID, problemID string) (*models.Battle, error)
	JoinBattle(battleID, playerID string) (*models.Battle, error)
	GetActiveBattles() ([]*models.Battle, error)
	FinishBattle(battleID, winnerID string) error

	// Admin
	GetAdminStats() (map[string]interface{}, error)
	GetAllUsers() ([]*models.User, error)
	DeleteUser(userID string) error
	UpdateUserRole(userID, role string) error
	BanUser(userID string, banned bool) error
	UpdateUserStats(userID, problemID string, difficulty models.Difficulty, points int) error
	UpdateUserStreak(userID string) error
}

// Handler holds all dependencies.
type Handler struct {
	store    Store
	executor *execution.DockerExecutor
	queue    *queue.Client
	hub      *ws.Hub
	authSvc  *auth.Service
	mailer   mail.Mailer
}

func New(database Store, queueClient *queue.Client, hub *ws.Hub, authSvc *auth.Service, executor *execution.DockerExecutor, mailer mail.Mailer) *Handler {
	return &Handler{
		store:    database,
		executor: executor,
		queue:    queueClient,
		hub:      hub,
		authSvc:  authSvc,
		mailer:   mailer,
	}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func ok(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

func (h *Handler) InternalBroadcast(c *gin.Context) {
	room := c.Query("room")
	var msg models.WSMessage
	if err := c.ShouldBindJSON(&msg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.hub != nil {
		log.Printf("Internal: Broadcasting to room %s, type %s", room, msg.Type)
		h.hub.Broadcast(room, msg)
	}
	c.Status(http.StatusOK)
}

func created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": data})
}

func badRequest(c *gin.Context, msg string) {
	c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": msg})
}

func notFound(c *gin.Context, msg string) {
	c.JSON(http.StatusNotFound, gin.H{"success": false, "error": msg})
}

func serverError(c *gin.Context, err error) {
	c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
}

func paginate(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	return page, pageSize
}

func (h *Handler) logAudit(c *gin.Context, userID, eventType string, metadata map[string]interface{}) {
	metaJSON, _ := json.Marshal(metadata)
	log := models.AuditLog{
		UserID:    userID,
		EventType: eventType,
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		Metadata:  string(metaJSON),
	}
	_ = h.store.CreateAuditLog(log)
}

// ─── Auth Handlers ────────────────────────────────────────────────────────────

func (h *Handler) Signup(c *gin.Context) {
	var req models.SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, err.Error())
		return
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		serverError(c, err)
		return
	}
	user, err := h.store.CreateUser(&req, string(hashed), false)
	if err != nil {
		log.Printf("DEBUG: Signup failed for %s: CreateUser error: %v", req.Email, err)
		if strings.Contains(err.Error(), "users_username_key") || strings.Contains(err.Error(), "users_email_key") {
			badRequest(c, "Username or email already exists")
			return
		}
		serverError(c, err)
		return
	}

	// Send current verification email (the raw token was temporarily put in VerificationTokenHash by CreateUser)
	rawToken := user.VerificationTokenHash
	_ = h.mailer.SendVerificationEmail(user.Email, user.Username, rawToken)

	h.logAudit(c, user.ID, "signup", nil)

	token, expiresAt, err := h.authSvc.GenerateToken(user)
	if err != nil {
		serverError(c, err)
		return
	}
	created(c, models.AuthResponse{Token: token, ExpiresAt: expiresAt, User: *user})
}
func (h *Handler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, err.Error())
		return
	}
	user, err := h.store.GetUserByEmail(req.Email)
	if err != nil {
		log.Printf("DEBUG: Login failed for %s: GetUserByEmail error: %v", req.Email, err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	log.Printf("DEBUG: Found user %s, comparing password...", user.Email)
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		log.Printf("DEBUG: Password mismatch for %s", req.Email)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	// Enforce ban — banned users cannot log in
	if user.IsBanned {
		c.JSON(http.StatusForbidden, gin.H{"error": "Your account has been suspended. Contact support."})
		return
	}
	token, expiresAt, err := h.authSvc.GenerateToken(user)
	if err != nil {
		serverError(c, err)
		return
	}
	ok(c, models.AuthResponse{Token: token, ExpiresAt: expiresAt, User: *user})
}

func (h *Handler) GoogleLogin(c *gin.Context) {
	var body struct {
		Credential string `json:"credential" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		badRequest(c, err.Error())
		return
	}

	// 1. Verify Google Token
	googleUser, err := auth.VerifyGoogleToken(c.Request.Context(), body.Credential)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid google token: " + err.Error()})
		return
	}

	// 2. Find or Create User
	user, err := h.store.GetUserByEmail(googleUser.Email)
	if err != nil {
		// User doesn't exist, create them
		username := googleUser.Name
		if username == "" {
			username = strings.Split(googleUser.Email, "@")[0]
		}

		// Ensure username uniqueness (simple version)
		if existing, _ := h.store.GetUserByUsername(username); existing != nil {
			username = username + "_" + uuid.New().String()[:4]
		}

		signupReq := &models.SignupRequest{
			Username: username,
			Email:    googleUser.Email,
			Password: uuid.New().String(), // Random password for OAuth users
		}

		user, err = h.store.CreateUser(signupReq, "", true) // Google users are pre-verified
		if err != nil {
			serverError(c, err)
			return
		}
	}

	// 3. Generate Kenyx Token
	token, expiresAt, err := h.authSvc.GenerateToken(user)
	if err != nil {
		serverError(c, err)
		return
	}

	ok(c, models.AuthResponse{Token: token, ExpiresAt: expiresAt, User: *user})
}

// VerifyEmail processes the verification token sent via email
func (h *Handler) VerifyEmail(c *gin.Context) {
	rawToken := c.Query("token")
	if rawToken == "" {
		badRequest(c, "verification token is required")
		return
	}

	// 1. Hash the incoming token
	tokenHash := auth.HashToken(rawToken)

	// 2. Validate hash and expiry
	userID, err := h.store.VerifyUserByToken(tokenHash)
	if err != nil {
		h.logAudit(c, "", "verify_fail", map[string]interface{}{"error": err.Error(), "token_hash": tokenHash})
		badRequest(c, err.Error())
		return
	}

	h.logAudit(c, userID, "verify_success", nil)

	// Fetch user to send welcome email
	user, err := h.store.GetUserByID(userID)
	if err == nil {
		go h.mailer.SendWelcomeEmail(user.Email, user.Username)
	}

	ok(c, "Account verified successfully! You can now participate in all activities.")
}

func (h *Handler) ResendVerification(c *gin.Context) {
	userID := auth.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// 1. Rate Limiting (5 attempts per minute)
	rateKey := fmt.Sprintf("ratelimit:resend:%s", userID)
	allowed, err := h.queue.RateLimit(c.Request.Context(), rateKey, 5, 1*time.Minute)
	if err != nil {
		serverError(c, err)
		return
	}
	if !allowed {
		h.logAudit(c, userID, "rate_limit_tripped", map[string]interface{}{"path": "/auth/verify/resend"})
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "Too many requests. Please wait a minute."})
		return
	}

	user, err := h.store.GetUserByID(userID)
	if err != nil {
		notFound(c, "user not found")
		return
	}
	if user.IsVerified {
		badRequest(c, "Account is already verified")
		return
	}

	// 2. Generate new hashed token
	rawToken, _ := auth.GenerateSecureToken()
	tokenHash := auth.HashToken(rawToken)
	expiresAt := time.Now().Add(1 * time.Hour)

	// 3. Update DB & Send Link
	if err := h.store.UpdateVerificationToken(userID, tokenHash, expiresAt); err != nil {
		serverError(c, err)
		return
	}

	_ = h.mailer.SendVerificationEmail(user.Email, user.Username, rawToken)
	h.logAudit(c, userID, "resend_verification", nil)

	ok(c, "A new verification link has been sent to your email.")
}

func (h *Handler) requireVerified(c *gin.Context) bool {
	userID := auth.GetUserID(c)
	user, err := h.store.GetUserByID(userID)
	if err != nil || !user.IsVerified {
		c.JSON(http.StatusForbidden, gin.H{"error": "Verify your email to perform this action"})
		return false
	}
	return true
}

func (h *Handler) RefreshToken(c *gin.Context) {
	var body struct {
		Token string `json:"token"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		badRequest(c, err.Error())
		return
	}
	claims, err := h.authSvc.ParseToken(body.Token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}
	user, err := h.store.GetUserByID(claims.UserID)
	if err != nil {
		notFound(c, "user not found")
		return
	}
	token, expiresAt, err := h.authSvc.GenerateToken(user)
	if err != nil {
		serverError(c, err)
		return
	}
	ok(c, gin.H{"token": token, "expires_at": expiresAt})
}

// ─── Problem Handlers ─────────────────────────────────────────────────────────

func (h *Handler) ListProblems(c *gin.Context) {
	difficulty := c.Query("difficulty")
	tag := c.Query("tag")
	status := c.DefaultQuery("status", "approved")
	page, pageSize := paginate(c)
	userID := auth.GetUserID(c)

	items, total, err := h.store.ListProblems(difficulty, tag, status, userID, page, pageSize)
	if err != nil {
		serverError(c, err)
		return
	}

	totalPages := total / pageSize
	if total%pageSize != 0 {
		totalPages++
	}
	ok(c, models.PaginatedResponse{
		Data: items, Total: total, Page: page,
		PageSize: pageSize, TotalPages: totalPages,
	})
}

func (h *Handler) GetProblem(c *gin.Context) {
	slug := c.Param("slug")

	problem, err := h.store.GetProblemBySlug(slug)
	if err != nil {
		notFound(c, "problem not found")
		return
	}

	userID := auth.GetUserID(c)
	var lastSub *models.Submission
	if userID != "" && problem != nil {
		// Attempt to fetch latest submission, but don't fail if not found
		lastSub, _ = h.store.GetLatestSubmission(userID, problem.ID)
	}

	// Always wrap in a consistent structure
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"problem":         problem,
			"last_submission": lastSub,
		},
	})
}

func (h *Handler) GetProblemStats(c *gin.Context) {
	slug := c.Param("slug")
	problem, err := h.store.GetProblemBySlug(slug)
	if err != nil {
		notFound(c, "problem not found")
		return
	}
	ok(c, gin.H{
		"slug":       problem.Slug,
		"likes":      problem.Likes,
		"solves":     problem.Solves,
		"acceptance": problem.Acceptance,
	})
}

func (h *Handler) GetDailyChallenge(c *gin.Context) {
	p, err := h.store.GetDailyChallenge()
	if err != nil {
		notFound(c, "no daily challenge")
		return
	}
	ok(c, p)
}

func (h *Handler) GetTrendingProblems(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "6"))
	probs, err := h.store.GetTrendingProblems(limit)
	if err != nil {
		serverError(c, err)
		return
	}
	ok(c, probs)
}

func (h *Handler) CreateProblem(c *gin.Context) {
	if !h.requireVerified(c) {
		return
	}
	userID := auth.GetUserID(c)
	username := auth.GetUsername(c)
	var req models.CreateProblemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, err.Error())
		return
	}
	if len(req.TestCases) < 2 {
		badRequest(c, "At least 2 test cases are required")
		return
	}
	status := models.StatusPending
	displayName := username
	if auth.IsAdmin(c) {
		status = models.StatusApproved
		displayName = "Kenyx Official"
	}

	problem, err := h.store.CreateProblem(&req, userID, displayName, status)
	if err != nil {
		serverError(c, err)
		return
	}
	created(c, problem)
}

func (h *Handler) UpdateProblem(c *gin.Context) {
	slug := c.Param("slug")
	userID := auth.GetUserID(c)

	problem, err := h.store.GetProblemBySlug(slug)
	if err != nil {
		notFound(c, "problem not found")
		return
	}

	// Only admin or creator can update
	if !auth.IsAdmin(c) && problem.CreatorID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to update this problem"})
		return
	}

	var req models.CreateProblemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, err.Error())
		return
	}

	if err := h.store.UpdateProblem(slug, &req); err != nil {
		serverError(c, err)
		return
	}

	ok(c, gin.H{"updated": true, "slug": slug})
}

func (h *Handler) DeleteProblem(c *gin.Context) {
	slug := c.Param("slug")
	// Only admins can delete for now to avoid community mess
	if !auth.IsAdmin(c) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only admins can delete problems"})
		return
	}

	if err := h.store.DeleteProblem(slug); err != nil {
		serverError(c, err)
		return
	}

	ok(c, gin.H{"deleted": true, "slug": slug})
}

func (h *Handler) LikeProblem(c *gin.Context) {
	userID := auth.GetUserID(c)
	slug := c.Param("slug")
	problem, err := h.store.GetProblemBySlug(slug)
	if err != nil {
		notFound(c, "problem not found")
		return
	}
	liked, err := h.store.LikeProblem(userID, problem.ID)
	if err != nil {
		serverError(c, err)
		return
	}
	ok(c, gin.H{"liked": liked})
}

func (h *Handler) RateProblem(c *gin.Context) {
	var req models.RateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, err.Error())
		return
	}
	ok(c, gin.H{"rated": true, "rating": req.Rating})
}

// ─── Submission Handlers ──────────────────────────────────────────────────────

func (h *Handler) SubmitCode(c *gin.Context) {
	userID := auth.GetUserID(c)
	slug := c.Param("slug")

	var req models.SubmitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, err.Error())
		return
	}

	problem, err := h.store.GetProblemBySlug(slug)
	if err != nil {
		notFound(c, "problem not found")
		return
	}

	submissionID := uuid.New().String()
	sub := &models.Submission{
		ID:          submissionID,
		UserID:      userID,
		ProblemID:   problem.ID,
		ProblemSlug: func() string {
			if problem.Slug != "" {
				return problem.Slug
			}
			return slug // Fallback to URL parameter
		}(),
		ProblemTitle: problem.Title,
		BattleID:    req.BattleID,
		Language:    req.Language,
		Code:        req.Code,
		Status:      models.SubmissionQueued,
		CreatedAt:   time.Now(),
	}

	if err := h.store.CreateSubmission(sub); err != nil {
		serverError(c, err)
		return
	}

	// Increment total problem submissions for stats
	_ = h.store.IncrementProblemSubmissions(problem.ID)

	job := queue.SubmissionJob{
		SubmissionID: submissionID,
		UserID:       userID,
		ProblemSlug:  slug,
		BattleID:     req.BattleID,
		Language:     req.Language,
		Code:         req.Code,
	}

	if h.queue != nil {
		if err := h.queue.EnqueueSubmission(job); err != nil {
			// If Redis is down, run synchronously (dev fallback)
			go h.processSubmissionDirect(sub, problem, req)
		}
	} else {
		go h.processSubmissionDirect(sub, problem, req)
	}

	created(c, gin.H{"submission_id": submissionID, "status": "queued"})
}

func (h *Handler) processSubmissionDirect(sub *models.Submission, problem *models.Problem, req models.SubmitRequest) {
	testCases, _ := h.store.GetTestCases(problem.ID)

	if h.hub != nil {
		h.hub.Broadcast(sub.ID, models.WSMessage{
			Type: models.WSSubmissionStatus,
			Payload: models.SubmissionStatusEvent{
				SubmissionID: sub.ID, Status: models.SubmissionRunning,
				Output: "Running test cases (Direct Mode)...",
			},
		})
	}

	passedCases := 0
	totalCases := len(testCases)
	var (
		finalStatus = models.SubmissionAccepted
		results     []models.CaseResult
		maxRuntime  int
	)

	for i, tc := range testCases {
		if h.hub != nil {
			msg := models.WSMessage{
				Type:    models.WSSubmissionOutput,
				Payload: map[string]interface{}{"output": fmt.Sprintf("Running test case %d/%d...", i+1, totalCases), "submission_id": sub.ID},
			}
			h.hub.Broadcast(sub.ID, msg)
		}

		// Execute using Docker
		result, err := h.executor.ExecuteTestCase(context.Background(), req.Language, req.Code, tc.Input, 5000, 262144)
		if err != nil {
			finalStatus = models.SubmissionRuntimeError
			break
		}

		if result.TimedOut {
			finalStatus = models.SubmissionTimeLimit
			results = append(results, models.CaseResult{
				Input: tc.Input, Expected: tc.Expected, Got: "TIME LIMIT EXCEEDED", Passed: false, RuntimeMs: 5000,
			})
			break
		}

		got := strings.ReplaceAll(strings.TrimSpace(result.Stdout), "\r", "")
		expected := strings.ReplaceAll(strings.TrimSpace(tc.Expected), "\r", "")
		passed := execution.CompareOutputs(result.Stdout, tc.Expected, problem.ComparisonMode)

		if result.ExitCode != 0 {
			if strings.Contains(result.Stderr, "error") {
				finalStatus = models.SubmissionCompileError
			} else {
				finalStatus = models.SubmissionRuntimeError
			}
			results = append(results, models.CaseResult{
				Input: tc.Input, Expected: expected, Got: result.Stderr, Passed: false, RuntimeMs: result.RuntimeMs,
			})
			break
		}

		if !passed && finalStatus == models.SubmissionAccepted {
			finalStatus = models.SubmissionWrongAnswer
		}

		if passed {
			passedCases++
		}
		if result.RuntimeMs > maxRuntime {
			maxRuntime = result.RuntimeMs
		}

		results = append(results, models.CaseResult{
			Input: tc.Input, Expected: expected, Got: got, Passed: passed, RuntimeMs: result.RuntimeMs,
		})
	}

	sub.Status = finalStatus
	sub.PassedCases = passedCases
	sub.TotalCases = totalCases
	sub.RuntimeMs = maxRuntime
	sub.Results = results
	h.store.UpdateSubmission(sub)

	if finalStatus == models.SubmissionAccepted {
		h.store.UpdateUserStats(sub.UserID, problem.ID, problem.Difficulty, problem.Points)
		h.store.UpdateUserStreak(sub.UserID)
	}

	if h.hub != nil {
		// ✅ Full result to submitter ONLY (their private submission channel)
		h.hub.Broadcast(sub.ID, models.WSMessage{
			Type: models.WSSubmissionResult,
			Payload: models.SubmissionResultEvent{
				SubmissionID: sub.ID,
				UserID:       sub.UserID,
				Status:       finalStatus,
				RuntimeMs:    maxRuntime,
				PassedCases:  passedCases,
				TotalCases:   totalCases,
				Results:      results,
			},
		})

		// ✅ Battle room ONLY gets battle:finished (no result leakage to opponent)
		if req.BattleID != "" && finalStatus == models.SubmissionAccepted {
			// Ensure battle is marked as finished in the API's memory space
			h.store.FinishBattle(req.BattleID, sub.UserID)

			h.hub.Broadcast(req.BattleID, models.WSMessage{
				Type: models.WSBattleFinished,
				Payload: map[string]interface{}{
					"battle_id": req.BattleID,
					"winner_id": sub.UserID,
				},
			})
		}
	}
}

func (h *Handler) RunCode(c *gin.Context) {
	slug := c.Param("slug")
	var req models.SubmitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, err.Error())
		return
	}

	problem, err := h.store.GetProblemBySlug(slug)
	if err != nil {
		notFound(c, fmt.Sprintf("BACKEND ERROR: Problem '%s' not found. Inner error: %v", slug, err))
		return
	}

	testCases, _ := h.store.GetTestCases(problem.ID)
	var samples []*models.TestCase
	for _, tc := range testCases {
		if tc.IsSample {
			samples = append(samples, tc)
		}
	}

	if len(samples) == 0 && len(testCases) > 0 {
		samples = append(samples, testCases[0])
	}

	var results []models.CaseResult
	for _, tc := range samples {
		res, err := h.executor.ExecuteTestCase(context.Background(), req.Language, req.Code, tc.Input, 5000, 262144)
		if err != nil {
			results = append(results, models.CaseResult{Passed: false, Got: err.Error()})
			continue
		}

		gotStr := strings.TrimSpace(res.Stdout)
		if res.Stderr != "" {
			if gotStr != "" {
				gotStr += "\n"
			}
			gotStr += "Error: " + strings.TrimSpace(res.Stderr)
		}
		got := strings.ReplaceAll(gotStr, "\r", "")
		expected := strings.ReplaceAll(strings.TrimSpace(tc.Expected), "\r", "")
		passed := execution.CompareOutputs(got, tc.Expected, problem.ComparisonMode)

		results = append(results, models.CaseResult{
			Input: tc.Input, Expected: expected, Got: got, Passed: passed, RuntimeMs: res.RuntimeMs,
		})

		if res.ExitCode != 0 || !passed {
			break // Stop on first error/failure for "Run"
		}
	}

	ok(c, gin.H{
		"status":  "run_complete",
		"results": results,
	})
}

func (h *Handler) GetSubmission(c *gin.Context) {
	id := c.Param("id")
	sub, err := h.store.GetSubmissionByID(id)
	if err != nil {
		notFound(c, "submission not found")
		return
	}
	ok(c, sub)
}

func (h *Handler) GetSubmissionStatus(c *gin.Context) {
	id := c.Param("id")
	sub, err := h.store.GetSubmissionByID(id)
	if err != nil {
		notFound(c, "submission not found")
		return
	}
	ok(c, gin.H{"submission_id": id, "status": sub.Status})
}

func (h *Handler) GetMySubmissions(c *gin.Context) {
	userID := auth.GetUserID(c)
	slug := c.Param("slug")
	problem, err := h.store.GetProblemBySlug(slug)
	if err != nil {
		notFound(c, "problem not found")
		return
	}
	subs, err := h.store.GetUserSubmissions(userID, problem.ID)
	if err != nil {
		serverError(c, err)
		return
	}
	ok(c, subs)
}

// ─── User Handlers ────────────────────────────────────────────────────────────

func (h *Handler) GetMe(c *gin.Context) {
	userID := auth.GetUserID(c)
	user, err := h.store.GetUserByID(userID)
	if err != nil {
		notFound(c, "user not found")
		return
	}
	stats, _ := h.store.GetUserStats(userID)
	ok(c, models.UserProfile{User: *user, Stats: *stats})
}

func (h *Handler) UpdateMe(c *gin.Context) {
	userID := auth.GetUserID(c)
	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, err.Error())
		return
	}
	if err := h.store.UpdateUser(userID, &req); err != nil {
		serverError(c, err)
		return
	}
	ok(c, gin.H{"updated": true})
}

func (h *Handler) GetMyStats(c *gin.Context) {
	userID := auth.GetUserID(c)
	stats, err := h.store.GetUserStats(userID)
	if err != nil {
		serverError(c, err)
		return
	}
	ok(c, stats)
}

func (h *Handler) GetMyAllSubmissions(c *gin.Context) {
	userID := auth.GetUserID(c)
	subs, err := h.store.GetUserSubmissions(userID, "")
	if err != nil {
		serverError(c, err)
		return
	}
	ok(c, subs)
}

func (h *Handler) GetMyCreatedProblems(c *gin.Context) {
	userID := auth.GetUserID(c)
	log.Printf("DEBUG: GetMyCreatedProblems hit for userID: %s", userID)
	probs, err := h.store.GetUserProblems(userID)
	if err != nil {
		log.Printf("DEBUG: GetUserProblems error: %v", err)
		serverError(c, err)
		return
	}
	log.Printf("DEBUG: Found %d problems for user %s", len(probs), userID)
	ok(c, probs)
}

func (h *Handler) GetMyActivity(c *gin.Context) {
	userID := auth.GetUserID(c)
	timezone := c.DefaultQuery("tz", "UTC")
	activity, err := h.store.GetActivityHeatmap(userID, timezone)
	if err != nil {
		serverError(c, err)
		return
	}
	ok(c, activity)
}

func (h *Handler) GetUserProfile(c *gin.Context) {
	username := c.Param("username")
	user, err := h.store.GetUserByUsername(username)
	if err != nil {
		notFound(c, "user not found")
		return
	}
	stats, _ := h.store.GetUserStats(user.ID)
	ok(c, models.UserProfile{User: *user, Stats: *stats})
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

func (h *Handler) GetLeaderboard(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	entries, err := h.store.GetLeaderboard(limit)
	if err != nil {
		serverError(c, err)
		return
	}
	ok(c, entries)
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

func (h *Handler) ListTags(c *gin.Context) {
	tags, err := h.store.ListTags()
	if err != nil {
		serverError(c, err)
		return
	}
	ok(c, tags)
}

// ─── Battle ───────────────────────────────────────────────────────────────────

func (h *Handler) CreateBattle(c *gin.Context) {
	userID := auth.GetUserID(c)
	var body struct {
		ProblemID string `json:"problem_id"`
	}
	c.ShouldBindJSON(&body)

	// --- Auto-Matchmaking (Quick Match) Logic ---
	// If the user isn't asking for a specific problem, try matching them with someone waiting
	if body.ProblemID == "" {
		active, err := h.store.GetActiveBattles()
		if err == nil {
			for _, b := range active {
				// Find an oldest waiting battle where we aren't the host
				if b.Status == models.BattleWaiting && b.Player1ID != userID {
					// Atomically try to join
					battle, err := h.store.JoinBattle(b.ID, userID)
					if err == nil {
						// Success! Notify the host
						if h.hub != nil {
							h.hub.Broadcast(battle.ID, models.WSMessage{
								Type:    models.WSBattleUpdate,
								Payload: battle,
							})
						}
						ok(c, battle)
						return
					}
					// If join failed (e.g. someone else joined first), continue searching
				}
			}
		}
	}

	// --- Standard Create Logic (if no match found or problem specified) ---
	if body.ProblemID == "" {
		// Pick a random approved problem
		problems, _ := h.store.GetTrendingProblems(1)
		if len(problems) > 0 {
			body.ProblemID = problems[0].ID
		}
	}
	battle, err := h.store.CreateBattle(userID, body.ProblemID)
	if err != nil {
		serverError(c, err)
		return
	}

	// Fetch and attach problem details for immediate frontend display
	if p, err := h.store.GetProblemByID(battle.ProblemID); err == nil {
		battle.Problem = p
	}

	created(c, battle)
}

func (h *Handler) JoinBattle(c *gin.Context) {
	userID := auth.GetUserID(c)
	battleID := c.Param("id")
	battle, err := h.store.JoinBattle(battleID, userID)
	if err != nil {
		notFound(c, "battle not found")
		return
	}

	// Fetch and attach problem details for both players
	if p, err := h.store.GetProblemByID(battle.ProblemID); err == nil {
		battle.Problem = p
	}

	if h.hub != nil {
		h.hub.Broadcast(battle.ID, models.WSMessage{
			Type:    models.WSBattleUpdate,
			Payload: battle,
		})
	}
	ok(c, battle)
}

func (h *Handler) GetActiveBattles(c *gin.Context) {
	battles, err := h.store.GetActiveBattles()
	if err != nil {
		serverError(c, err)
		return
	}
	ok(c, battles)
}

// ─── Admin ────────────────────────────────────────────────────────────────────

func (h *Handler) GetPendingProblems(c *gin.Context) {
	probs, err := h.store.GetPendingProblems()
	if err != nil {
		serverError(c, err)
		return
	}
	ok(c, probs)
}

func (h *Handler) ApproveProblem(c *gin.Context) {
	slug := c.Param("slug")
	if err := h.store.ApproveProblem(slug); err != nil {
		notFound(c, "problem not found")
		return
	}
	ok(c, gin.H{"approved": true, "slug": slug})
}

func (h *Handler) RejectProblem(c *gin.Context) {
	slug := c.Param("slug")
	var req models.RejectProblemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, err.Error())
		return
	}
	if err := h.store.RejectProblem(slug, req.Note); err != nil {
		notFound(c, "problem not found")
		return
	}
	ok(c, gin.H{"rejected": true, "slug": slug})
}

func (h *Handler) GetAdminStats(c *gin.Context) {
	stats, err := h.store.GetAdminStats()
	if err != nil {
		serverError(c, err)
		return
	}
	ok(c, stats)
}

func (h *Handler) ListUsers(c *gin.Context) {
	users, err := h.store.GetAllUsers()
	if err != nil {
		serverError(c, err)
		return
	}
	ok(c, users)
}

func (h *Handler) DeleteUser(c *gin.Context) {
	targetID := c.Param("id")
	requesterID := auth.GetUserID(c)

	// Prevent self-deletion
	if targetID == requesterID {
		badRequest(c, "You cannot delete your own account")
		return
	}

	// Prevent deleting other admins
	target, err := h.store.GetUserByID(targetID)
	if err != nil {
		notFound(c, "user not found")
		return
	}
	if string(target.Role) == "admin" {
		badRequest(c, "Cannot delete another admin account")
		return
	}

	if err := h.store.DeleteUser(targetID); err != nil {
		serverError(c, err)
		return
	}
	ok(c, gin.H{"deleted": true, "user_id": targetID})
}

func (h *Handler) UpdateUserRole(c *gin.Context) {
	targetID := c.Param("id")
	requesterID := auth.GetUserID(c)

	var body struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		badRequest(c, err.Error())
		return
	}

	if body.Role != "user" && body.Role != "admin" {
		badRequest(c, "role must be 'user' or 'admin'")
		return
	}

	// Prevent self-demotion
	if targetID == requesterID {
		badRequest(c, "You cannot change your own role")
		return
	}

	if err := h.store.UpdateUserRole(targetID, body.Role); err != nil {
		serverError(c, err)
		return
	}
	ok(c, gin.H{"updated": true, "user_id": targetID, "role": body.Role})
}

func (h *Handler) BanUser(c *gin.Context) {
	targetID := c.Param("id")
	requesterID := auth.GetUserID(c)

	if targetID == requesterID {
		badRequest(c, "You cannot ban your own account")
		return
	}

	var body struct {
		Banned bool `json:"banned"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		badRequest(c, err.Error())
		return
	}

	if err := h.store.BanUser(targetID, body.Banned); err != nil {
		serverError(c, err)
		return
	}

	action := "banned"
	if !body.Banned {
		action = "unbanned"
	}
	ok(c, gin.H{"user_id": targetID, "status": action})
}
