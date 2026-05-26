package db

import (
	"context"
	"fmt"
	"strings"
	"time"

	"kenyx/internal/models"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoStore struct {
	client *mongo.Client
	db     *mongo.Database
}

func NewMongoStore(uri, dbName string) (*MongoStore, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, err
	}

	err = client.Ping(ctx, nil)
	if err != nil {
		return nil, err
	}

	return &MongoStore{
		client: client,
		db:     client.Database(dbName),
	}, nil
}

// ─── Users ────────────────────────────────────────────────────────────────────

func (s *MongoStore) GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	err := s.db.Collection("users").FindOne(context.Background(), bson.M{"email": email}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *MongoStore) GetUserByID(id string) (*models.User, error) {
	var user models.User
	err := s.db.Collection("users").FindOne(context.Background(), bson.M{"id": id}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *MongoStore) GetUserByUsername(username string) (*models.User, error) {
	var user models.User
	err := s.db.Collection("users").FindOne(context.Background(), bson.M{"username": username}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *MongoStore) CreateUser(req *models.SignupRequest, hashedPassword string, isVerified bool) (*models.User, error) {
	user := &models.User{
		ID:         uuid.New().String(),
		Username:   req.Username,
		Email:      req.Email,
		Password:   hashedPassword,
		Role:       models.RoleUser,
		IsVerified: isVerified,
		CreatedAt:  time.Now(),
		LastActive: time.Now(),
	}
	_, err := s.db.Collection("users").InsertOne(context.Background(), user)
	if err != nil {
		return nil, err
	}
	return user, nil
}

// ─── Problems ────────────────────────────────────────────────────────────────

func (s *MongoStore) ListProblems(difficulty, tag, status, userID string, page, pageSize int) ([]*models.ProblemListItem, int, error) {
	filter := bson.M{}
	if status != "" && status != "all" {
		filter["status"] = status
	}
	if difficulty != "" {
		filter["difficulty"] = difficulty
	}
	if tag != "" {
		filter["tags.slug"] = tag
	}

	opts := options.Find().
		SetLimit(int64(pageSize)).
		SetSkip(int64((page - 1) * pageSize)).
		SetSort(bson.M{"created_at": -1})

	cursor, err := s.db.Collection("problems").Find(context.Background(), filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(context.Background())

	// Fetch user's solved problem IDs if userID is provided
	solvedMap := make(map[string]bool)
	if userID != "" {
		var stats models.UserStats
		err := s.db.Collection("user_stats").FindOne(context.Background(), bson.M{"user_id": userID}).Decode(&stats)
		if err == nil {
			for _, pid := range stats.SolvedProblemIDs {
				solvedMap[pid] = true
			}
		}
	}

	var problems []*models.ProblemListItem
	for cursor.Next(context.Background()) {
		var p models.Problem
		if err := cursor.Decode(&p); err != nil {
			continue
		}
		item := &models.ProblemListItem{
			ID:          p.ID,
			Slug:        p.Slug,
			Title:       p.Title,
			Difficulty:  p.Difficulty,
			Status:      p.Status,
			CreatorName: p.CreatorName,
			Likes:       p.Likes,
			Solves:      p.Solves,
			Acceptance:  p.Acceptance,
			Tags:        p.Tags,
			UserSolved:  solvedMap[p.ID],
		}
		problems = append(problems, item)
	}

	total, _ := s.db.Collection("problems").CountDocuments(context.Background(), filter)
	return problems, int(total), nil
}

func (s *MongoStore) GetProblemBySlug(slug string) (*models.Problem, error) {
	var problem models.Problem
	err := s.db.Collection("problems").FindOne(context.Background(), bson.M{"slug": slug}).Decode(&problem)
	if err != nil {
		return nil, err
	}
	return &problem, nil
}

func (s *MongoStore) GetProblemByID(id string) (*models.Problem, error) {
	var problem models.Problem
	err := s.db.Collection("problems").FindOne(context.Background(), bson.M{"id": id}).Decode(&problem)
	if err != nil {
		return nil, err
	}
	return &problem, nil
}

func (s *MongoStore) GetTestCases(problemID string) ([]*models.TestCase, error) {
	var problem models.Problem
	err := s.db.Collection("problems").FindOne(context.Background(), bson.M{"id": problemID}).Decode(&problem)
	if err != nil {
		return nil, err
	}
	var tcs []*models.TestCase
	for _, tc := range problem.TestCases {
		t := tc
		tcs = append(tcs, &t)
	}
	return tcs, nil
}

func (s *MongoStore) GetDailyChallenge() (*models.Problem, error) {
	var problem models.Problem
	err := s.db.Collection("problems").FindOne(context.Background(), bson.M{"is_daily": true}).Decode(&problem)
	if err != nil {
		return nil, err
	}
	return &problem, nil
}

func (s *MongoStore) GetTrendingProblems(limit int) ([]*models.Problem, error) {
	opts := options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "likes", Value: -1}, {Key: "solves", Value: -1}})
	cursor, err := s.db.Collection("problems").Find(context.Background(), bson.M{"status": "approved"}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())
	var probs []*models.Problem
	if err = cursor.All(context.Background(), &probs); err != nil {
		return nil, err
	}
	return probs, nil
}

func (s *MongoStore) CreateProblem(req *models.CreateProblemRequest, creatorID, creatorName string, status models.ProblemStatus) (*models.Problem, error) {
	problem := &models.Problem{
		ID:             uuid.New().String(),
		Slug:           strings.ReplaceAll(strings.ToLower(req.Title), " ", "-"),
		Title:          req.Title,
		Description:    req.Description,
		Constraints:    req.Constraints,
		InputFormat:    req.InputFormat,
		OutputFormat:   req.OutputFormat,
		Difficulty:     req.Difficulty,
		Status:         status,
		CreatorID:      creatorID,
		CreatorName:    creatorName,
		ComparisonMode: req.ComparisonMode,
		Points: func() int {
			switch req.Difficulty {
			case models.DifficultyMedium:
				return 20
			case models.DifficultyHard:
				return 30
			default:
				return 10
			}
		}(),
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	// Resolve tags
	if len(req.Tags) > 0 {
		var resolvedTags []models.Tag
		for _, tagRef := range req.Tags {
			// 1. Try to find by ID
			var t models.Tag
			err := s.db.Collection("tags").FindOne(context.Background(), bson.M{
				"$or": []bson.M{
					{"id": tagRef},
					{"name": tagRef},
				},
			}).Decode(&t)

			if err == nil {
				resolvedTags = append(resolvedTags, t)
			} else {
				// 2. Not found, create NEW tag
				newTag := models.Tag{
					ID:   uuid.New().String(),
					Name: tagRef,
					Slug: strings.ReplaceAll(strings.ToLower(tagRef), " ", "-"),
				}
				s.db.Collection("tags").InsertOne(context.Background(), newTag)
				resolvedTags = append(resolvedTags, newTag)
			}
		}
		problem.Tags = resolvedTags
	}
	for i, tc := range req.TestCases {
		problem.TestCases = append(problem.TestCases, models.TestCase{
			ID:       uuid.New().String(),
			Input:    tc.Input,
			Expected: tc.Expected,
			IsSample: tc.IsSample,
			OrderNum: i,
		})
	}
	_, err := s.db.Collection("problems").InsertOne(context.Background(), problem)
	if err != nil {
		return nil, err
	}
	return problem, nil
}

func (s *MongoStore) ApproveProblem(slug string) error {
	_, err := s.db.Collection("problems").UpdateOne(context.Background(), bson.M{"slug": slug}, bson.M{"$set": bson.M{"status": models.StatusApproved}})
	return err
}

func (s *MongoStore) RejectProblem(slug, note string) error {
	_, err := s.db.Collection("problems").UpdateOne(context.Background(), bson.M{"slug": slug}, bson.M{"$set": bson.M{"status": models.StatusRejected, "rejection_note": note}})
	return err
}

func (s *MongoStore) GetPendingProblems() ([]*models.Problem, error) {
	cursor, err := s.db.Collection("problems").Find(context.Background(), bson.M{"status": models.StatusPending})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())
	var probs []*models.Problem
	if err = cursor.All(context.Background(), &probs); err != nil {
		return nil, err
	}
	return probs, nil
}

func (s *MongoStore) GetUserProblems(userID string) ([]*models.Problem, error) {
	ctx := context.Background()
	cursor, err := s.db.Collection("problems").Find(ctx, bson.M{"creator_id": userID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var probs []*models.Problem
	if err = cursor.All(ctx, &probs); err != nil {
		return nil, err
	}
	return probs, nil
}

func (s *MongoStore) LikeProblem(userID, problemID string) (bool, error) {
	// Simple implementation
	return true, nil
}

// ─── Submissions ──────────────────────────────────────────────────────────────

func (s *MongoStore) CreateSubmission(sub *models.Submission) error {
	_, err := s.db.Collection("submissions").InsertOne(context.Background(), sub)
	return err
}

func (s *MongoStore) UpdateSubmission(sub *models.Submission) error {
	ctx := context.Background()
	update := bson.M{
		"$set": bson.M{
			"status":       sub.Status,
			"runtime_ms":   sub.RuntimeMs,
			"memory_kb":    sub.MemoryKB,
			"passed_cases": sub.PassedCases,
			"total_cases":  sub.TotalCases,
			"error_msg":    sub.ErrorMsg,
			"results":      sub.Results,
			"updated_at":   time.Now(),
		},
	}
	_, err := s.db.Collection("submissions").UpdateOne(ctx, bson.M{"id": sub.ID}, update)
	return err
}

func (s *MongoStore) GetSubmissionByID(id string) (*models.Submission, error) {
	var sub models.Submission
	err := s.db.Collection("submissions").FindOne(context.Background(), bson.M{"id": id}).Decode(&sub)
	return &sub, err
}

func (s *MongoStore) GetLatestSubmission(userID, problemID string) (*models.Submission, error) {
	filter := bson.M{"user_id": userID, "problem_id": problemID}
	opts := options.FindOne().SetSort(bson.M{"created_at": -1})
	
	var sub models.Submission
	err := s.db.Collection("submissions").FindOne(context.Background(), filter, opts).Decode(&sub)
	if err != nil {
		return nil, err
	}
	return &sub, nil
}

func (s *MongoStore) GetUserSubmissions(userID, problemID string) ([]*models.Submission, error) {
	filter := bson.M{"user_id": userID}
	if problemID != "" {
		filter["problem_id"] = problemID
	}

	cursor, err := s.db.Collection("submissions").Find(context.Background(), filter, options.Find().SetSort(bson.M{"created_at": -1}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())
	var subs []*models.Submission
	if err = cursor.All(context.Background(), &subs); err != nil {
		return nil, err
	}
	return subs, nil
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

func (s *MongoStore) ListTags() ([]*models.Tag, error) {
	cursor, err := s.db.Collection("tags").Find(context.Background(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())
	var tags []*models.Tag
	if err = cursor.All(context.Background(), &tags); err != nil {
		return nil, err
	}
	return tags, nil
}

func (s *MongoStore) CreateAuditLog(log models.AuditLog) error {
	_, err := s.db.Collection("audit_logs").InsertOne(context.Background(), log)
	return err
}

func (s *MongoStore) GetUserStats(userID string) (*models.UserStats, error) {
	var stats models.UserStats
	err := s.db.Collection("user_stats").FindOne(context.Background(), bson.M{"user_id": userID}).Decode(&stats)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return &models.UserStats{UserID: userID, Rank: 0}, nil
		}
		return nil, err
	}

	// Calculate rank: 1 + count of users with total_score > current_user_score
	// We only want to compare against "user" role accounts, not "admin"
	
	// First, get all admin IDs to exclude them
	adminCursor, _ := s.db.Collection("users").Find(context.Background(), bson.M{"role": models.RoleAdmin})
	var admins []models.User
	adminCursor.All(context.Background(), &admins)
	
	adminIDs := make([]string, len(admins))
	for i, a := range admins {
		adminIDs[i] = a.ID
	}

	// Count users with higher score who are NOT in the admin list
	rankFilter := bson.M{
		"total_score": bson.M{"$gt": stats.TotalScore},
		"user_id":     bson.M{"$nin": adminIDs},
	}
	
	higherCount, _ := s.db.Collection("user_stats").CountDocuments(context.Background(), rankFilter)
	stats.Rank = int(higherCount) + 1

	// Populate global counts for dynamic denominators
	stats.GlobalEasy, _ = s.db.Collection("problems").CountDocuments(context.Background(), bson.M{"difficulty": "easy", "status": models.StatusApproved})
	stats.GlobalMedium, _ = s.db.Collection("problems").CountDocuments(context.Background(), bson.M{"difficulty": "medium", "status": models.StatusApproved})
	stats.GlobalHard, _ = s.db.Collection("problems").CountDocuments(context.Background(), bson.M{"difficulty": "hard", "status": models.StatusApproved})

	return &stats, nil
}

func (s *MongoStore) UpdateUser(userID string, req *models.UpdateProfileRequest) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	update := bson.M{
		"$set": bson.M{
			"bio":        req.Bio,
			"avatar_url": req.AvatarURL,
		},
	}

	_, err := s.db.Collection("users").UpdateOne(ctx, bson.M{"id": userID}, update)
	return err
}

func (s *MongoStore) GetActivityHeatmap(userID string, timezone string) ([]models.ActivityEntry, error) {
	ctx := context.Background()
	
	if timezone == "" {
		timezone = "UTC"
	}

	// Calculate date 366 days ago
	threeSixtySixDaysAgo := time.Now().UTC().AddDate(-1, 0, -1)

	pipeline := mongo.Pipeline{
		// 1. Filter by user and date
		{{Key: "$match", Value: bson.M{
			"user_id":    userID,
			"created_at": bson.M{"$gte": threeSixtySixDaysAgo},
		}}},
		// 2. Project and convert date with local timezone
		{{Key: "$project", Value: bson.M{
			"day": bson.M{"$dateToString": bson.M{
				"format": "%Y-%m-%d", 
				"date":   "$created_at",
				"timezone": timezone,
			}},
		}}},
		// 3. Group by day and count
		{{Key: "$group", Value: bson.M{
			"_id":   "$day",
			"count": bson.M{"$sum": 1},
		}}},
		// 4. Sort by date
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
	}

	cursor, err := s.db.Collection("submissions").Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.ActivityEntry
	for cursor.Next(ctx) {
		var raw struct {
			ID    string `bson:"_id"`
			Count int    `bson:"count"`
		}
		if err := cursor.Decode(&raw); err != nil {
			continue
		}
		results = append(results, models.ActivityEntry{
			Date:  raw.ID,
			Count: raw.Count,
		})
	}

	return results, nil
}

func (s *MongoStore) VerifyUserByToken(token string) (string, error) {
	var user models.User
	err := s.db.Collection("users").FindOne(context.Background(), bson.M{"verification_token_hash": token}).Decode(&user)
	if err != nil {
		return "", err
	}
	_, err = s.db.Collection("users").UpdateOne(context.Background(), bson.M{"id": user.ID}, bson.M{"$set": bson.M{"is_verified": true}})
	return user.ID, err
}

func (s *MongoStore) UpdateVerificationToken(userID, tokenHash string, expiresAt time.Time) error {
	_, err := s.db.Collection("users").UpdateOne(context.Background(), bson.M{"id": userID}, bson.M{"$set": bson.M{"verification_token_hash": tokenHash, "verification_expires_at": expiresAt}})
	return err
}

// ─── Notifications ────────────────────────────────────────────────────────────

func (s *MongoStore) GetMyNotifications(userID string) ([]*models.Notification, error) {
	cursor, err := s.db.Collection("notifications").Find(context.Background(), bson.M{"user_id": userID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())
	var notes []*models.Notification
	if err = cursor.All(context.Background(), &notes); err != nil {
		return nil, err
	}
	return notes, nil
}

func (s *MongoStore) MarkNotificationRead(id, userID string) error {
	_, err := s.db.Collection("notifications").UpdateOne(context.Background(), bson.M{"id": id, "user_id": userID}, bson.M{"$set": bson.M{"is_read": true}})
	return err
}

func (s *MongoStore) MarkAllNotificationsRead(userID string) error {
	_, err := s.db.Collection("notifications").UpdateMany(context.Background(), bson.M{"user_id": userID}, bson.M{"$set": bson.M{"is_read": true}})
	return err
}

// ─── Battles ──────────────────────────────────────────────────────────────────

func (s *MongoStore) CreateBattle(playerID, problemID string) (*models.Battle, error) {
	playerName := "Player 1"
	if user, err := s.GetUserByID(playerID); err == nil {
		playerName = user.Username
	}

	battle := &models.Battle{
		ID:          uuid.New().String(),
		Player1ID:   playerID,
		Player1Name: playerName,
		ProblemID:   problemID,
		Status:      models.BattleWaiting,
		CreatedAt:   time.Now(),
	}
	_, err := s.db.Collection("battles").InsertOne(context.Background(), battle)
	return battle, err
}

func (s *MongoStore) JoinBattle(battleID, playerID string) (*models.Battle, error) {
	now := time.Now()
	
	battleID = strings.TrimSpace(battleID)
	if len(battleID) < 6 {
		return nil, fmt.Errorf("invalid battle ID format")
	}

	// Support both full UUID and 8-character short ID
	filter := bson.M{
		"$or": []bson.M{
			{"id": battleID},
			{"id": bson.M{"$regex": primitive.Regex{Pattern: battleID + "$", Options: "i"}}},
		},
	}

	var battle models.Battle
	err := s.db.Collection("battles").FindOne(context.Background(), filter).Decode(&battle)
	if err != nil {
		return nil, err
	}

	playerName := "Player 2"
	if user, err := s.GetUserByID(playerID); err == nil {
		playerName = user.Username
	}

	_, err = s.db.Collection("battles").UpdateOne(context.Background(), bson.M{"id": battle.ID}, bson.M{"$set": bson.M{"player2_id": playerID, "player2_name": playerName, "status": models.BattleActive, "started_at": &now}})
	if err != nil {
		return nil, err
	}

	err = s.db.Collection("battles").FindOne(context.Background(), bson.M{"id": battle.ID}).Decode(&battle)
	return &battle, err
}

func (s *MongoStore) GetActiveBattles() ([]*models.Battle, error) {
	cursor, err := s.db.Collection("battles").Find(context.Background(), bson.M{"status": models.BattleWaiting})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())
	var battles []*models.Battle
	if err = cursor.All(context.Background(), &battles); err != nil {
		return nil, err
	}
	return battles, nil
}

func (s *MongoStore) FinishBattle(battleID, winnerID string) error {
	now := time.Now()
	_, err := s.db.Collection("battles").UpdateOne(context.Background(), bson.M{"id": battleID}, bson.M{"$set": bson.M{"winner_id": winnerID, "status": models.BattleFinished, "finished_at": &now}})
	return err
}

// ─── Admin ────────────────────────────────────────────────────────────────────

func (s *MongoStore) GetAdminStats() (map[string]interface{}, error) {
	userCount, _ := s.db.Collection("users").CountDocuments(context.Background(), bson.M{})
	probCount, _ := s.db.Collection("problems").CountDocuments(context.Background(), bson.M{})
	subCount, _ := s.db.Collection("submissions").CountDocuments(context.Background(), bson.M{})

	// Difficulty breakdown
	easy, _ := s.db.Collection("problems").CountDocuments(context.Background(), bson.M{"difficulty": "easy"})
	medium, _ := s.db.Collection("problems").CountDocuments(context.Background(), bson.M{"difficulty": "medium"})
	hard, _ := s.db.Collection("problems").CountDocuments(context.Background(), bson.M{"difficulty": "hard"})

	return map[string]interface{}{
		"total_users":       userCount,
		"total_problems":    probCount,
		"total_submissions": subCount,
		"total_solved":      subCount, // Approximation
		"difficulty_freq": map[string]int64{
			"easy":   easy,
			"medium": medium,
			"hard":   hard,
		},
	}, nil
}

func (s *MongoStore) GetAllUsers() ([]*models.User, error) {
	cursor, err := s.db.Collection("users").Find(context.Background(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())
	var users []*models.User
	if err = cursor.All(context.Background(), &users); err != nil {
		return nil, err
	}
	return users, nil
}

func (s *MongoStore) DeleteUser(userID string) error {
	ctx := context.Background()

	// Professional soft-delete: anonymize PII, ban the account.
	// Submissions, problems and stats are kept intact for community integrity.
	anonymizedUsername := fmt.Sprintf("deleted_user_%s", userID[:8])

	_, err := s.db.Collection("users").UpdateOne(ctx, bson.M{"id": userID}, bson.M{
		"$set": bson.M{
			"username":   anonymizedUsername,
			"email":      "",
			"password":   "",
			"bio":        "",
			"avatar_url": "",
			"is_banned":  true,
			"is_deleted": true,
			"deleted_at": time.Now(),
		},
	})
	return err
}

func (s *MongoStore) UpdateUserRole(userID, role string) error {
	_, err := s.db.Collection("users").UpdateOne(context.Background(), bson.M{"id": userID}, bson.M{"$set": bson.M{"role": role}})
	return err
}

func (s *MongoStore) BanUser(userID string, banned bool) error {
	_, err := s.db.Collection("users").UpdateOne(context.Background(), bson.M{"id": userID}, bson.M{"$set": bson.M{"is_banned": banned}})
	return err
}

func (s *MongoStore) GetLeaderboard(limit int) ([]*models.LeaderboardEntry, error) {
	ctx := context.Background()

	// Fetch admin IDs to exclude them from the leaderboard
	adminCursor, _ := s.db.Collection("users").Find(ctx, bson.M{"role": models.RoleAdmin})
	var admins []models.User
	adminCursor.All(ctx, &admins)
	adminIDs := make([]string, len(admins))
	for i, a := range admins {
		adminIDs[i] = a.ID
	}

	// Query user_stats sorted by total_score desc, excluding admins
	opts := options.Find().
		SetSort(bson.D{{Key: "total_score", Value: -1}}).
		SetLimit(int64(limit))

	filter := bson.M{"user_id": bson.M{"$nin": adminIDs}}
	cursor, err := s.db.Collection("user_stats").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var statsList []models.UserStats
	if err = cursor.All(ctx, &statsList); err != nil {
		return nil, err
	}

	// Build a map of userID -> User for quick lookup
	userIDs := make([]string, len(statsList))
	for i, s := range statsList {
		userIDs[i] = s.UserID
	}

	userCursor, err := s.db.Collection("users").Find(ctx, bson.M{"id": bson.M{"$in": userIDs}})
	if err != nil {
		return nil, err
	}
	var users []models.User
	userCursor.All(ctx, &users)

	userMap := make(map[string]models.User, len(users))
	for _, u := range users {
		userMap[u.ID] = u
	}

	// Assemble leaderboard entries
	entries := make([]*models.LeaderboardEntry, 0, len(statsList))
	for i, stats := range statsList {
		u, ok := userMap[stats.UserID]
		if !ok {
			continue // skip orphaned stats
		}
		entries = append(entries, &models.LeaderboardEntry{
			Rank:           i + 1,
			UserID:         stats.UserID,
			Username:       u.Username,
			AvatarURL:      u.AvatarURL,
			ProblemsSolved: stats.ProblemsSolved,
			TotalScore:     stats.TotalScore,
			Streak:         u.Streak,
			RankChange:     0, // rank_change can be implemented later with historical snapshots
		})
	}

	return entries, nil
}

func (s *MongoStore) BootstrapAdmin(email, username, password string) error {
	var user models.User
	err := s.db.Collection("users").FindOne(context.Background(), bson.M{"email": email}).Decode(&user)
	if err == nil {
		// User exists, ensure they are admin
		_, err = s.db.Collection("users").UpdateOne(context.Background(), bson.M{"email": email}, bson.M{"$set": bson.M{"role": models.RoleAdmin, "is_verified": true}})
		return err
	}

	// Create admin
	fromPass, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	user = models.User{
		ID:         uuid.New().String(),
		Email:      email,
		Username:   username,
		Password:   string(fromPass),
		Role:       models.RoleAdmin,
		IsVerified: true,
		CreatedAt:  time.Now(),
	}
	_, err = s.db.Collection("users").InsertOne(context.Background(), user)
	return err
}

func (s *MongoStore) GetUserProfile(username string) (*models.UserProfile, error) {
	user, err := s.GetUserByUsername(username)
	if err != nil {
		return nil, err
	}
	stats, _ := s.GetUserStats(user.ID)
	return &models.UserProfile{User: *user, Stats: *stats}, nil
}

func (s *MongoStore) GetMyStats(userID string) (*models.UserStats, error) {
	return s.GetUserStats(userID)
}

func (s *MongoStore) GetMyAllSubmissions(userID string) ([]*models.Submission, error) {
	cursor, err := s.db.Collection("submissions").Find(context.Background(), bson.M{"user_id": userID})
	if err != nil {
		return nil, err
	}
	var subs []*models.Submission
	cursor.All(context.Background(), &subs)
	return subs, nil
}

func (s *MongoStore) GetMyCreatedProblems(userID string) ([]*models.Problem, error) {
	return s.GetUserProblems(userID)
}

func (s *MongoStore) GetMyActivity(userID string, timezone string) ([]models.ActivityEntry, error) {
	return s.GetActivityHeatmap(userID, timezone)
}

func (s *MongoStore) ListUsers() ([]*models.User, error) {
	return s.GetAllUsers()
}

func (s *MongoStore) UpdateUserStats(userID, problemID string, difficulty models.Difficulty, points int) error {
	ctx := context.Background()

	// 1. Perform the update: increment solves and score, and add the problemID to the array
	// We use a filter to ensure we only update if the problemID is NOT in the solved_problem_ids list.
	// This makes the operation ATOMIC and prevents double-counting.
	filter := bson.M{
		"user_id":            userID,
		"solved_problem_ids": bson.M{"$ne": problemID},
	}

	update := bson.M{
		"$inc": bson.M{"problems_solved": 1, "total_score": points},
		"$set": bson.M{"updated_at": time.Now()},
		"$addToSet": bson.M{"solved_problem_ids": problemID},
	}

	field := "easy_solved"
	if difficulty == models.DifficultyMedium {
		field = "medium_solved"
	} else if difficulty == models.DifficultyHard {
		field = "hard_solved"
	}
	update["$inc"].(bson.M)[field] = 1

	result, err := s.db.Collection("user_stats").UpdateOne(
		ctx,
		filter,
		update,
		options.Update().SetUpsert(false), // Don't upsert with this specific filter
	)
	if err != nil {
		return err
	}

	// 2. If no document was updated, it might be because:
	//    a) The problem was already solved (filter didn't match)
	//    b) The user_stats document doesn't exist yet
	if result.ModifiedCount == 0 {
		// Check if it's because the document doesn't exist
		exists, _ := s.db.Collection("user_stats").CountDocuments(ctx, bson.M{"user_id": userID})
		if exists == 0 {
			// First time solving ANY problem: Create the document
			newStats := bson.M{
				"user_id":            userID,
				"problems_solved":    1,
				"easy_solved":        0,
				"medium_solved":      0,
				"hard_solved":        0,
				"total_score":       points,
				"solved_problem_ids": []string{problemID},
				"updated_at":         time.Now(),
			}
			newStats[field] = 1
			_, err = s.db.Collection("user_stats").InsertOne(ctx, newStats)
			return err
		}
		// Otherwise, it was already solved, which is fine
		return nil
	}

	// 3. Increment global problem solves
	_, _ = s.db.Collection("problems").UpdateOne(ctx, bson.M{"id": problemID}, bson.M{"$inc": bson.M{"solves": 1}})

	return nil
}
func (s *MongoStore) IncrementProblemSubmissions(problemID string) error {
	ctx := context.Background()
	
	// 1. Increment total submissions
	_, err := s.db.Collection("problems").UpdateOne(ctx, bson.M{"id": problemID}, bson.M{"$inc": bson.M{"total_submissions": 1}})
	if err != nil {
		return err
	}

	// 2. Recalculate Acceptance rate
	var p models.Problem
	err = s.db.Collection("problems").FindOne(ctx, bson.M{"id": problemID}).Decode(&p)
	if err == nil && p.TotalSubmissions > 0 {
		acc := float64(p.Solves) / float64(p.TotalSubmissions)
		s.db.Collection("problems").UpdateOne(ctx, bson.M{"id": problemID}, bson.M{"$set": bson.M{"acceptance": acc}})
	}

	return nil
}

func (s *MongoStore) UpdateUserStreak(userID string) error {
	var user models.User
	err := s.db.Collection("users").FindOne(context.Background(), bson.M{"id": userID}).Decode(&user)
	if err != nil {
		return err
	}

	now := time.Now().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	last := time.Date(user.LastSolved.Year(), user.LastSolved.Month(), user.LastSolved.Day(), 0, 0, 0, 0, time.UTC)

	if today.Equal(last) {
		return nil // Already solved today
	}

	newStreak := 1
	// Check if last solve was exactly yesterday
	if today.Sub(last).Hours() <= 24 {
		newStreak = user.Streak + 1
	}

	_, err = s.db.Collection("users").UpdateOne(
		context.Background(),
		bson.M{"id": userID},
		bson.M{"$set": bson.M{"streak": newStreak, "last_solved": now}},
	)
	return err
}

func (s *MongoStore) UpdateProblem(slug string, req *models.CreateProblemRequest) error {
	ctx := context.Background()
	
	// Prepare test cases
	var testCases []models.TestCase
	for i, tc := range req.TestCases {
		testCases = append(testCases, models.TestCase{
			ID:       uuid.New().String(),
			Input:    tc.Input,
			Expected: tc.Expected,
			IsSample: tc.IsSample,
			OrderNum: i,
		})
	}

	points := 10
	if req.Difficulty == models.DifficultyMedium {
		points = 20
	} else if req.Difficulty == models.DifficultyHard {
		points = 30
	}

	// If slug is empty in DB, we should regenerate it from title
	slugToSet := slug
	if slug == "" {
		slugToSet = strings.ReplaceAll(strings.ToLower(req.Title), " ", "-")
	}

	update := bson.M{
		"$set": bson.M{
			"slug":            slugToSet,
			"title":           req.Title,
			"description":     req.Description,
			"constraints":     req.Constraints,
			"input_format":    req.InputFormat,
			"output_format":   req.OutputFormat,
			"difficulty":      req.Difficulty,
			"points":          points,
			"comparison_mode": req.ComparisonMode,
			"test_cases":      testCases,
			"updated_at":      time.Now(),
		},
	}

	// Resolve tags
	if len(req.Tags) > 0 {
		cursor, err := s.db.Collection("tags").Find(ctx, bson.M{"id": bson.M{"$in": req.Tags}})
		if err == nil {
			var resolvedTags []models.Tag
			if err := cursor.All(ctx, &resolvedTags); err == nil {
				update["$set"].(bson.M)["tags"] = resolvedTags
			}
		}
	} else {
		update["$set"].(bson.M)["tags"] = []models.Tag{}
	}

	_, err := s.db.Collection("problems").UpdateOne(ctx, bson.M{"slug": slug}, update)
	return err
}

func (s *MongoStore) DeleteProblem(slug string) error {
	_, err := s.db.Collection("problems").DeleteOne(context.Background(), bson.M{"slug": slug})
	return err
}
