package models

import (
	"time"
)

// ─── User ────────────────────────────────────────────────────────────────────

type Role string

const (
	RoleUser  Role = "user"
	RoleAdmin Role = "admin"
)

type User struct {
	ID         string    `json:"id" db:"id" bson:"id"`
	Username   string    `json:"username" db:"username" bson:"username"`
	Email      string    `json:"email,omitempty" db:"email" bson:"email"`
	Password   string    `json:"-" db:"password" bson:"password"`
	AvatarURL  string    `json:"avatar_url" db:"avatar_url" bson:"avatar_url"`
	Bio        string    `json:"bio" db:"bio" bson:"bio"`
	Role                     Role       `json:"role" db:"role" bson:"role"`
	Reputation               int        `json:"reputation" db:"reputation" bson:"reputation"`
	IsVerified               bool       `json:"is_verified" db:"is_verified" bson:"is_verified"`
	IsBanned                 bool       `json:"is_banned" db:"is_banned" bson:"is_banned"`
	VerificationTokenHash    string     `json:"-" db:"verification_token_hash" bson:"verification_token_hash"`
	VerificationExpiresAt    *time.Time `json:"-" db:"verification_expires_at" bson:"verification_expires_at"`
	Streak                   int        `json:"streak" db:"streak" bson:"streak"`
	LastSolved               time.Time  `json:"last_solved" db:"last_solved" bson:"last_solved"`
	LastActive time.Time `json:"last_active" db:"last_active" bson:"last_active"`
	CreatedAt  time.Time `json:"created_at" db:"created_at" bson:"created_at"`
}

type AuditLog struct {
	ID        string    `json:"id" db:"id" bson:"id"`
	UserID    string    `json:"user_id" db:"user_id" bson:"user_id"`
	EventType string    `json:"event_type" db:"event_type" bson:"event_type"`
	IPAddress string    `json:"ip_address" db:"ip_address" bson:"ip_address"`
	UserAgent string    `json:"user_agent" db:"user_agent" bson:"user_agent"`
	Metadata  string    `json:"metadata" db:"metadata" bson:"metadata"`
	CreatedAt time.Time `json:"created_at" db:"created_at" bson:"created_at"`
}

type UserStats struct {
	UserID         string    `json:"user_id" db:"user_id" bson:"user_id"`
	ProblemsSolved int       `json:"problems_solved" db:"problems_solved" bson:"problems_solved"`
	EasySolved     int       `json:"easy_solved" db:"easy_solved" bson:"easy_solved"`
	MediumSolved   int       `json:"medium_solved" db:"medium_solved" bson:"medium_solved"`
	HardSolved     int       `json:"hard_solved" db:"hard_solved" bson:"hard_solved"`
	TotalScore     int       `json:"total_score" db:"total_score" bson:"total_score"`
	Rank           int       `json:"rank" db:"rank" bson:"rank"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at" bson:"updated_at"`
	GlobalEasy     int64     `json:"global_easy"`
	GlobalMedium   int64     `json:"global_medium"`
	GlobalHard     int64     `json:"global_hard"`
	SolvedProblemIDs []string `json:"solved_problem_ids" bson:"solved_problem_ids"`
}

// ... rest of the models with bson tags ...

type UserProfile struct {
	User
	Stats UserStats `json:"stats"`
}

// Activity heatmap entry
type ActivityEntry struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

// ─── Problem ────────────────────────────────────────────────────────────────

type Difficulty string

const (
	DifficultyEasy   Difficulty = "easy"
	DifficultyMedium Difficulty = "medium"
	DifficultyHard   Difficulty = "hard"
)

// ─── Notification ───────────────────────────────────────────────────────────

type NotificationType string

const (
	NotifySuccess NotificationType = "success"
	NotifyInfo    NotificationType = "info"
	NotifyWarning NotificationType = "warning"
	NotifyDanger  NotificationType = "danger"
)

type Notification struct {
	ID        string           `json:"id" db:"id" bson:"id"`
	UserID    string           `json:"user_id" db:"user_id" bson:"user_id"`
	Title     string           `json:"title" db:"title" bson:"title"`
	Message   string           `json:"message" db:"message" bson:"message"`
	Type      NotificationType `json:"type" db:"type" bson:"type"`
	Link      string           `json:"link,omitempty" db:"link" bson:"link"`
	IsRead    bool             `json:"is_read" db:"is_read" bson:"is_read"`
	CreatedAt time.Time        `json:"created_at" db:"created_at" bson:"created_at"`
}

type ProblemStatus string

const (
	StatusPending  ProblemStatus = "pending"
	StatusApproved ProblemStatus = "approved"
	StatusRejected ProblemStatus = "rejected"
)

type Problem struct {
	ID            string        `json:"id" db:"id" bson:"id"`
	Slug          string        `json:"slug" db:"slug" bson:"slug"`
	Title         string        `json:"title" db:"title" bson:"title"`
	Description   string        `json:"description" db:"description" bson:"description"`
	Constraints   string        `json:"constraints" db:"constraints" bson:"constraints"`
	InputFormat   string        `json:"input_format" db:"input_format" bson:"input_format"`
	OutputFormat  string        `json:"output_format" db:"output_format" bson:"output_format"`
	Difficulty    Difficulty    `json:"difficulty" db:"difficulty" bson:"difficulty"`
	Status        ProblemStatus `json:"status" db:"status" bson:"status"`
	CreatorID     string        `json:"creator_id" db:"creator_id" bson:"creator_id"`
	CreatorName   string        `json:"creator_name" db:"creator_name" bson:"creator_name"`
	Likes         int           `json:"likes" db:"likes" bson:"likes"`
	Solves            int           `json:"solves" db:"solves" bson:"solves"`
	TotalSubmissions  int           `json:"total_submissions" db:"total_submissions" bson:"total_submissions"`
	Acceptance        float64       `json:"acceptance" db:"acceptance" bson:"acceptance"`
	IsDaily       bool          `json:"is_daily" db:"is_daily" bson:"is_daily"`
	RejectionNote string        `json:"rejection_note,omitempty" db:"rejection_note" bson:"rejection_note"`
	ComparisonMode string        `json:"comparison_mode" db:"comparison_mode" bson:"comparison_mode"`
	Tags           []Tag         `json:"tags" bson:"tags"`
	Points         int           `json:"points" db:"points" bson:"points"`
	TestCases     []TestCase    `json:"test_cases,omitempty" bson:"test_cases,omitempty"`
	CreatedAt     time.Time     `json:"created_at" db:"created_at" bson:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at" db:"updated_at" bson:"updated_at"`
}

type ProblemListItem struct {
	ID           string        `json:"id" db:"id"`
	Slug         string        `json:"slug" db:"slug"`
	Title        string        `json:"title" db:"title"`
	Difficulty   Difficulty    `json:"difficulty" db:"difficulty"`
	Status       ProblemStatus `json:"status" db:"status"`
	CreatorName  string        `json:"creator_name" db:"creator_name"`
	Likes        int           `json:"likes" db:"likes"`
	Solves       int           `json:"solves" db:"solves"`
	Acceptance   float64       `json:"acceptance" db:"acceptance"`
	Tags         []Tag         `json:"tags"`
	UserSolved   bool          `json:"user_solved"` // computed per user
}

// ─── Tag ─────────────────────────────────────────────────────────────────────

type Tag struct {
	ID   string `json:"id" db:"id" bson:"id"`
	Name string `json:"name" db:"name" bson:"name"`
	Slug string `json:"slug" db:"slug" bson:"slug"`
}

// ─── Test Case ───────────────────────────────────────────────────────────────

type TestCase struct {
	ID        string `json:"id" db:"id" bson:"id"`
	ProblemID string `json:"problem_id" db:"problem_id" bson:"problem_id"`
	Input     string `json:"input" db:"input" bson:"input"`
	Expected  string `json:"expected" db:"expected" bson:"expected"`
	IsSample  bool   `json:"is_sample" db:"is_sample" bson:"is_sample"`
	OrderNum  int    `json:"order_num" db:"order_num" bson:"order_num"`
}

// ─── Submission ──────────────────────────────────────────────────────────────

type SubmissionStatus string

const (
	SubmissionQueued       SubmissionStatus = "queued"
	SubmissionRunning      SubmissionStatus = "running"
	SubmissionAccepted     SubmissionStatus = "accepted"
	SubmissionWrongAnswer  SubmissionStatus = "wrong_answer"
	SubmissionTimeLimit    SubmissionStatus = "time_limit_exceeded"
	SubmissionMemoryLimit  SubmissionStatus = "memory_limit_exceeded"
	SubmissionRuntimeError SubmissionStatus = "runtime_error"
	SubmissionCompileError SubmissionStatus = "compile_error"
)

type Submission struct {
	ID          string           `json:"id" db:"id" bson:"id"`
	UserID      string           `json:"user_id" db:"user_id" bson:"user_id"`
	Username    string           `json:"username" db:"username" bson:"username"`
	ProblemID   string           `json:"problem_id" db:"problem_id" bson:"problem_id"`
	ProblemSlug string           `json:"problem_slug" db:"problem_slug" bson:"problem_slug"`
	ProblemTitle string          `json:"problem_title" db:"problem_title" bson:"problem_title"`
	BattleID    string           `json:"battle_id,omitempty" db:"battle_id" bson:"battle_id,omitempty"`
	Language    string           `json:"language" db:"language" bson:"language"`
	Code        string           `json:"code,omitempty" db:"code" bson:"code,omitempty"`
	Status      SubmissionStatus `json:"status" db:"status" bson:"status"`
	RuntimeMs   int              `json:"runtime_ms" db:"runtime_ms" bson:"runtime_ms"`
	MemoryKB    int              `json:"memory_kb" db:"memory_kb" bson:"memory_kb"`
	PassedCases int              `json:"passed_cases" db:"passed_cases" bson:"passed_cases"`
	TotalCases  int              `json:"total_cases" db:"total_cases" bson:"total_cases"`
	ErrorMsg    string           `json:"error_msg,omitempty" db:"error_msg" bson:"error_msg,omitempty"`
	Results     []CaseResult     `json:"results,omitempty" bson:"results,omitempty"`
	CreatedAt   time.Time        `json:"created_at" db:"created_at" bson:"created_at"`
}

type CaseResult struct {
	Input    string `json:"input"`
	Expected string `json:"expected"`
	Got      string `json:"got"`
	Passed   bool   `json:"passed"`
	RuntimeMs int   `json:"runtime_ms"`
}

// ─── Battle ──────────────────────────────────────────────────────────────────

type BattleStatus string

const (
	BattleWaiting  BattleStatus = "waiting"
	BattleActive   BattleStatus = "active"
	BattleFinished BattleStatus = "finished"
)

type Battle struct {
	ID          string       `json:"id" db:"id" bson:"id"`
	ProblemID   string       `json:"problem_id" db:"problem_id" bson:"problem_id"`
	Problem     *Problem     `json:"problem,omitempty" bson:"problem,omitempty"`
	Player1ID   string       `json:"player1_id" db:"player1_id" bson:"player1_id"`
	Player1Name string       `json:"player1_name" db:"player1_name" bson:"player1_name"`
	Player2ID   string       `json:"player2_id,omitempty" db:"player2_id" bson:"player2_id,omitempty"`
	Player2Name string       `json:"player2_name,omitempty" db:"player2_name" bson:"player2_name,omitempty"`
	WinnerID    string       `json:"winner_id,omitempty" db:"winner_id" bson:"winner_id,omitempty"`
	Status      BattleStatus `json:"status" db:"status" bson:"status"`
	StartedAt   *time.Time   `json:"started_at,omitempty" db:"started_at" bson:"started_at,omitempty"`
	FinishedAt  *time.Time   `json:"finished_at,omitempty" db:"finished_at" bson:"finished_at,omitempty"`
	CreatedAt   time.Time    `json:"created_at" db:"created_at" bson:"created_at"`
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

type LeaderboardEntry struct {
	Rank           int    `json:"rank"`
	UserID         string `json:"user_id"`
	Username       string `json:"username"`
	AvatarURL      string `json:"avatar_url"`
	ProblemsSolved int    `json:"problems_solved"`
	TotalScore     int    `json:"total_score"`
	Streak         int    `json:"streak"`
	RankChange     int    `json:"rank_change"` // positive = improved
}

// ─── Request/Response DTOs ───────────────────────────────────────────────────

type SignupRequest struct {
	Username string `json:"username" binding:"required,min=3,max=32"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token     string `json:"token"`
	ExpiresAt int64  `json:"expires_at"`
	User      User   `json:"user"`
}

type SubmitRequest struct {
	Language string `json:"language" binding:"required"`
	Code     string `json:"code" binding:"required"`
	BattleID string `json:"battle_id,omitempty"`
}

type CreateProblemRequest struct {
	Title        string     `json:"title" binding:"required,min=5,max=256"`
	Description  string     `json:"description" binding:"required"`
	Constraints  string     `json:"constraints"`
	InputFormat  string     `json:"input_format"`
	OutputFormat string     `json:"output_format"`
	Difficulty   Difficulty `json:"difficulty" binding:"required,oneof=easy medium hard"`
	Tags         []string   `json:"tags"`
	Points       int        `json:"points"`
	TestCases    []struct {
		Input    string `json:"input" binding:"required"`
		Expected string `json:"expected" binding:"required"`
		IsSample bool   `json:"is_sample"`
	} `json:"test_cases" binding:"required,min=2"`
	ComparisonMode string `json:"comparison_mode" binding:"omitempty,oneof=exact sorted_numbers ignore_whitespace"`
}

type RejectProblemRequest struct {
	Note string `json:"note" binding:"required"`
}

type RateRequest struct {
	Rating int `json:"rating" binding:"required,min=1,max=5"`
}

type UpdateProfileRequest struct {
	Bio       string `json:"bio"`
	AvatarURL string `json:"avatar_url"`
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
	TotalPages int         `json:"total_pages"`
}

// ─── WebSocket Events ────────────────────────────────────────────────────────

type WSEventType string

const (
	WSSubmissionStatus  WSEventType = "submission:status"
	WSSubmissionResult  WSEventType = "submission:result"
	WSSubmissionOutput  WSEventType = "submission:output"
	WSBattleUpdate      WSEventType = "battle:update"
	WSBattleFinished    WSEventType = "battle:finished"
)

type WSMessage struct {
	Type    WSEventType `json:"type"`
	Payload interface{} `json:"payload"`
}

type SubmissionStatusEvent struct {
	SubmissionID string           `json:"submission_id"`
	Status       SubmissionStatus `json:"status"`
	Output       string           `json:"output,omitempty"`
}

type SubmissionResultEvent struct {
	SubmissionID string          `json:"submission_id"`
	UserID       string          `json:"user_id"`
	Status       SubmissionStatus `json:"status"`
	RuntimeMs    int             `json:"runtime_ms"`
	MemoryKB     int             `json:"memory_kb"`
	PassedCases  int             `json:"passed_cases"`
	TotalCases   int             `json:"total_cases"`
	Results      []CaseResult    `json:"results"`
	ErrorMsg     string          `json:"error_msg,omitempty"`
}
