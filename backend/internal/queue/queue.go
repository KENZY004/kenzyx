package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"kenyx/internal/execution"
	"kenyx/internal/models"
	"kenyx/internal/ws"

	"github.com/redis/go-redis/v9"
)

const (
	SubmissionQueueKey = "kenyx:submissions:queue"
	timeLimitMs        = 5000  // 5 seconds
	memLimitKB         = 262144 // 256 MB
)

// SubmissionJob represents a queued code submission.
type SubmissionJob struct {
	SubmissionID string `json:"submission_id"`
	UserID       string `json:"user_id"`
	ProblemSlug  string `json:"problem_slug"`
	BattleID     string `json:"battle_id"`
	Language     string `json:"language"`
	Code         string `json:"code"`
}

// Client pushes submission jobs into Redis.
type Client struct {
	rdb *redis.Client
}

func NewClient(redisAddr string) *Client {
	rdb := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: "",
		DB:       0,
	})
	return &Client{rdb: rdb}
}

func (c *Client) EnqueueSubmission(job SubmissionJob) error {
	data, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("marshal job: %w", err)
	}
	ctx := context.Background()
	return c.rdb.LPush(ctx, SubmissionQueueKey, data).Err()
}

// RateLimit checks if a key has exceeded a limit within a window.
func (c *Client) RateLimit(ctx context.Context, key string, limit int, window time.Duration) (bool, error) {
	pipe := c.rdb.Pipeline()
	count := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, window)
	_, err := pipe.Exec(ctx)
	if err != nil {
		return false, err
	}
	return int(count.Val()) <= limit, nil
}

// DB defines the database interface needed by the worker.
type DB interface {
	GetProblemBySlug(slug string) (*models.Problem, error)
	GetTestCases(problemID string) ([]*models.TestCase, error)
	UpdateSubmission(sub *models.Submission) error
	UpdateUserStats(userID, problemID string, difficulty models.Difficulty, points int) error
	UpdateUserStreak(userID string) error
	FinishBattle(battleID, winnerID string) error
}


// Worker dequeues and processes submission jobs.
type Worker struct {
	rdb      *redis.Client
	db       DB
	executor *execution.DockerExecutor
	wsClient *ws.HubClient
}

func NewWorker(redisAddr string, database DB, executor *execution.DockerExecutor, wsClient *ws.HubClient) *Worker {
	rdb := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})
	return &Worker{rdb: rdb, db: database, executor: executor, wsClient: wsClient}
}

func (w *Worker) Start(ctx context.Context) error {
	log.Println("Worker: listening for submission jobs...")
	for {
		select {
		case <-ctx.Done():
			return nil
		default:
		}

		// Blocking pop with 1s timeout
		result, err := w.rdb.BRPop(ctx, 1*time.Second, SubmissionQueueKey).Result()
		if err == redis.Nil {
			continue // no jobs
		}
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			log.Printf("Worker: Redis error: %v", err)
			time.Sleep(1 * time.Second)
			continue
		}

		if len(result) < 2 {
			continue
		}

		var job SubmissionJob
		if err := json.Unmarshal([]byte(result[1]), &job); err != nil {
			log.Printf("Worker: unmarshal job error: %v", err)
			continue
		}

		go w.processJob(ctx, job)
	}
}

func (w *Worker) processJob(ctx context.Context, job SubmissionJob) {
	log.Printf("Worker: processing submission %s (lang=%s)", job.SubmissionID, job.Language)

	// Notify: running
	w.broadcastStatus(job.SubmissionID, models.SubmissionRunning, "")

	// Get problem + test cases
	problem, err := w.db.GetProblemBySlug(job.ProblemSlug)
	if err != nil {
		log.Printf("Worker: problem not found: %v", err)
		w.finalizeSubmission(job.SubmissionID, job.UserID, "", job.BattleID, job.ProblemSlug, "", models.SubmissionRuntimeError, 0, 0, 0, 0, "Problem not found", nil, models.DifficultyEasy, 0)
		return
	}

	testCases, err := w.db.GetTestCases(problem.ID)
	if err != nil || len(testCases) == 0 {
		w.finalizeSubmission(job.SubmissionID, job.UserID, problem.ID, job.BattleID, job.ProblemSlug, problem.Title, models.SubmissionRuntimeError, 0, 0, 0, 0, "No test cases", nil, problem.Difficulty, problem.Points)
		return
	}

	// Run each test case
	var (
		passedCases int
		totalCases  = len(testCases)
		maxRuntime  int
		maxMemory   int
		results     []models.CaseResult
		finalStatus = models.SubmissionAccepted
	)

	for i, tc := range testCases {
		w.broadcastOutput(job.SubmissionID, fmt.Sprintf("Running test case %d/%d...", i+1, totalCases))

		// ✅ Progress to submitter ONLY — never to the battle room
		if w.wsClient != nil {
			msg := models.WSMessage{
				Type:    models.WSSubmissionOutput,
				Payload: map[string]interface{}{"output": fmt.Sprintf("Running test case %d/%d...", i+1, totalCases), "submission_id": job.SubmissionID},
			}
			w.wsClient.SendResult(job.SubmissionID, msg)
		}

		result, err := w.executor.ExecuteTestCase(ctx, job.Language, job.Code, tc.Input, timeLimitMs, memLimitKB)
		if err != nil {
			finalStatus = models.SubmissionRuntimeError
			break
		}

		if result.TimedOut {
			finalStatus = models.SubmissionTimeLimit
			results = append(results, models.CaseResult{
				Input: tc.Input, Expected: tc.Expected,
				Got: "TIME LIMIT EXCEEDED", Passed: false,
				RuntimeMs: timeLimitMs,
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
				Input: tc.Input, Expected: expected,
				Got: result.Stderr, Passed: false,
				RuntimeMs: result.RuntimeMs,
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
		if result.MemoryKB > maxMemory {
			maxMemory = result.MemoryKB
		}

		results = append(results, models.CaseResult{
			Input: tc.Input, Expected: expected,
			Got: got, Passed: passed,
			RuntimeMs: result.RuntimeMs,
		})
	}

	w.finalizeSubmission(
		job.SubmissionID, job.UserID, problem.ID, job.BattleID,
		job.ProblemSlug, problem.Title,
		finalStatus, maxRuntime, maxMemory,
		passedCases, totalCases, "", results, problem.Difficulty, problem.Points,
	)
}

func (w *Worker) finalizeSubmission(
	submissionID, userID, problemID, battleID string,
	problemSlug, problemTitle string,
	status models.SubmissionStatus,
	runtimeMs, memoryKB, passedCases, totalCases int,
	errMsg string,
	results []models.CaseResult,
	difficulty models.Difficulty,
	points int,
) {
	sub := &models.Submission{
		ID:           submissionID,
		UserID:       userID,
		ProblemID:    problemID,
		ProblemSlug:  problemSlug,
		ProblemTitle: problemTitle,
		Status:       status,
		RuntimeMs:    runtimeMs,
		MemoryKB:     memoryKB,
		PassedCases:  passedCases,
		TotalCases:   totalCases,
		ErrorMsg:     errMsg,
		Results:      results,
		CreatedAt:    time.Now(),
	}
	w.db.UpdateSubmission(sub)
	if status == models.SubmissionAccepted {
		w.db.UpdateUserStats(userID, problemID, difficulty, points)
		w.db.UpdateUserStreak(userID)
	}


	msg := models.WSMessage{
		Type: models.WSSubmissionResult,
		Payload: models.SubmissionResultEvent{
			SubmissionID: submissionID,
			UserID:       userID,
			Status:       status,
			RuntimeMs:    runtimeMs,
			MemoryKB:     memoryKB,
			PassedCases:  passedCases,
			TotalCases:   totalCases,
			Results:      results,
			ErrorMsg:     errMsg,
		},
	}

	// ✅ Send full result to submitter ONLY (via their unique submission channel)
	// Only THEY are subscribed to this room — no leaking to opponent.
	w.wsClient.SendResult(submissionID, msg)

	// ✅ Battle room gets battle:finished ONLY (no result details)
	if battleID != "" && status == models.SubmissionAccepted {
		if err := w.db.FinishBattle(battleID, userID); err == nil {
			w.wsClient.SendResult(battleID, models.WSMessage{
				Type: models.WSBattleFinished,
				Payload: map[string]interface{}{
					"battle_id": battleID,
					"winner_id": userID,
				},
			})
		}
	}

	log.Printf("Worker: submission %s finalized: %s (%d/%d cases)", submissionID, status, passedCases, totalCases)
}


func (w *Worker) broadcastStatus(submissionID string, status models.SubmissionStatus, output string) {
	if w.wsClient == nil {
		return
	}
	w.wsClient.SendResult(submissionID, models.WSMessage{
		Type: models.WSSubmissionStatus,
		Payload: models.SubmissionStatusEvent{
			SubmissionID: submissionID,
			Status:       status,
			Output:       output,
		},
	})
}

func (w *Worker) broadcastOutput(submissionID, output string) {
	if w.wsClient == nil {
		return
	}
	w.wsClient.SendResult(submissionID, models.WSMessage{
		Type:    models.WSSubmissionOutput,
		Payload: map[string]string{"output": output, "submission_id": submissionID},
	})
}
