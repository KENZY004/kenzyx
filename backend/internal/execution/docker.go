package execution

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
)

// DockerExecutor runs code inside isolated Docker containers.
type DockerExecutor struct {
	cli *client.Client
}

func NewDockerExecutor() *DockerExecutor {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("CRITICAL: Docker client init failed: %v", err)
	}
	return &DockerExecutor{cli: cli}
}

// Language config maps language → Docker image + file + command
type LangConfig struct {
	Image            string
	Filename         string
	RunCmd           []string
	CompileCmd       []string
	CompileOverheadMs int // extra ms added to timeout to account for compilation
}

var langConfigs = map[string]LangConfig{
	"python": {
		Image:    "kenyx-runner-python:latest",
		Filename: "solution.py",
		RunCmd:   []string{"python3", "solution.py"},
	},
	"javascript": {
		Image:    "kenyx-runner-node:latest",
		Filename: "solution.js",
		RunCmd:   []string{"node", "solution.js"},
	},
	"cpp": {
		Image:             "kenyx-runner-cpp:latest",
		Filename:          "solution.cpp",
		CompileCmd:        []string{"g++", "-O2", "-o", "solution", "solution.cpp"},
		RunCmd:            []string{"./solution"},
		CompileOverheadMs: 10000, // g++ can be slow in Docker
	},
	"java": {
		Image:             "kenyx-runner-java:latest",
		Filename:          "Solution.java",
		CompileCmd:        []string{"javac", "Solution.java"},
		RunCmd:            []string{"java", "-Xms8m", "-Xmx128m", "-XX:TieredStopAtLevel=1", "Solution"},
		CompileOverheadMs: 15000, // javac + JVM cold start
	},
}

// RunResult holds the output of one test case execution.
type RunResult struct {
	Stdout    string
	Stderr    string
	RuntimeMs int
	MemoryKB  int
	ExitCode  int
	TimedOut  bool
}

// ExecuteTestCase runs a single test case against the submitted code.
func (e *DockerExecutor) ExecuteTestCase(
	ctx context.Context,
	language, code, input string,
	timeLimitMs, memLimitKB int,
) (*RunResult, error) {
	// Docker must be available
	if e.cli == nil {
		return nil, fmt.Errorf("docker client not initialized")
	}

	cfg, ok := langConfigs[language]
	if !ok {
		return nil, fmt.Errorf("unsupported language: %s", language)
	}

	// Create container
	contConfig := &container.Config{
		Image: cfg.Image,
		Cmd:   cfg.RunCmd,
		// Write code as file via entrypoint
		AttachStdin:  true,
		AttachStdout: true,
		AttachStderr: true,
		OpenStdin:    true,
		StdinOnce:    true,
		Env: []string{
			fmt.Sprintf("FILENAME=%s", cfg.Filename),
			fmt.Sprintf("RUN_CMD=%s", strings.Join(cfg.RunCmd, " ")),
			fmt.Sprintf("COMPILE_CMD=%s", strings.Join(cfg.CompileCmd, " ")),
		},
	}

	hostConfig := &container.HostConfig{
		Resources: container.Resources{
			Memory:   int64(memLimitKB) * 1024,
			CPUQuota: 100000, // 100% of one CPU — compiled langs need full CPU
		},
		NetworkMode:    "none", // No network access
		ReadonlyRootfs: false,
		AutoRemove:     true,
	}

	resp, err := e.cli.ContainerCreate(ctx, contConfig, hostConfig, nil, nil, "")
	if err != nil {
		log.Printf("Docker Error (Create): %v", err)
		return nil, fmt.Errorf("container create error: %w", err)
	}

	containerID := resp.ID
	defer e.cli.ContainerRemove(ctx, containerID, container.RemoveOptions{Force: true})

	// Attach stdin to send code
	attach, err := e.cli.ContainerAttach(ctx, containerID, container.AttachOptions{
		Stream: true, Stdin: true, Stdout: true, Stderr: true,
	})
	if err != nil {
		return nil, fmt.Errorf("attach error: %w", err)
	}
	defer attach.Close()

	// Start container
	start := time.Now()
	if err := e.cli.ContainerStart(ctx, containerID, container.StartOptions{}); err != nil {
		return nil, fmt.Errorf("container start error: %w", err)
	}

	// Strip carriage returns to prevent \r breaking the shell scripts (like sed) inside the container
	cleanCode := strings.ReplaceAll(code, "\r", "")
	cleanInput := strings.ReplaceAll(input, "\r", "")

	// Send code and input via stdin with a separator
	payload := fmt.Sprintf("%s\n---KENYX-SEP---\n%s", cleanCode, cleanInput)
	io.WriteString(attach.Conn, payload)
	attach.CloseWrite()

	// Total timeout = problem time limit + compilation overhead for compiled languages
	totalTimeoutMs := timeLimitMs + cfg.CompileOverheadMs
	timeoutCtx, cancel := context.WithTimeout(ctx, time.Duration(totalTimeoutMs)*time.Millisecond)
	defer cancel()

	// Read stdout/stderr concurrently so the timeout can fire
	var stdout, stderr bytes.Buffer
	readDone := make(chan struct{})
	go func() {
		stdcopy.StdCopy(&stdout, &stderr, attach.Reader)
		close(readDone)
	}()

	waitCh, errCh := e.cli.ContainerWait(timeoutCtx, containerID, container.WaitConditionNotRunning)

	select {
	case result := <-waitCh:
		<-readDone // wait for output to finish
		elapsed := int(time.Since(start).Milliseconds())
		return &RunResult{
			Stdout:    strings.TrimSpace(stdout.String()),
			Stderr:    strings.TrimSpace(stderr.String()),
			RuntimeMs: elapsed,
			MemoryKB:  0,
			ExitCode:  int(result.StatusCode),
			TimedOut:  false,
		}, nil
	case err := <-errCh:
		if err == context.DeadlineExceeded {
			// Force kill the container
			e.cli.ContainerKill(context.Background(), containerID, "SIGKILL")
			return &RunResult{TimedOut: true, RuntimeMs: timeLimitMs}, nil
		}
		return nil, err
	}
}
