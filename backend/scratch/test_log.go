package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {
	resp, err := http.Get("http://localhost:8080/api/v1/problems/trending")
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("Status: %s\n", resp.Status)
	fmt.Printf("Body: %s\n", string(body))
}
