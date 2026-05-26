package execution

import (
	"sort"
	"strconv"
	"strings"
)

// Comparison modes
const (
	CompareExact            = "exact"
	CompareSortedNumbers    = "sorted_numbers"
	CompareIgnoreWhitespace = "ignore_whitespace"
)

// CompareOutputs compares the actual output with the expected output based on the problem's mode.
func CompareOutputs(got, expected, mode string) bool {
	// Standard normalization for all modes
	got = strings.TrimSpace(got)
	expected = strings.TrimSpace(expected)

	// Clean up newlines (\r\n -> \n)
	got = strings.ReplaceAll(got, "\r", "")
	expected = strings.ReplaceAll(expected, "\r", "")

	switch mode {
	case CompareSortedNumbers:
		return compareSortedNumbers(got, expected)
	case CompareIgnoreWhitespace:
		return strings.ReplaceAll(got, " ", "") == strings.ReplaceAll(expected, " ", "")
	case CompareExact:
		fallthrough
	default:
		// Try exact first
		if got == expected {
			return true
		}
		// Fallback: If it's a numeric problem, try being flexible
		return compareSortedNumbers(got, expected)
	}
}

func compareSortedNumbers(got, expected string) bool {
	gotNums, gotHasNoise := parseNumbersWithNoiseCheck(got)
	expNums, _ := parseNumbersWithNoiseCheck(expected)

	// Failure if user printed extra words (noise)
	if gotHasNoise {
		return false
	}

	if len(gotNums) != len(expNums) {
		return false
	}

	sort.Float64s(gotNums)
	sort.Float64s(expNums)

	for i := range gotNums {
		if gotNums[i] != expNums[i] {
			return false
		}
	}

	return true
}

func parseNumbersWithNoiseCheck(s string) ([]float64, bool) {
	var nums []float64
	hasNoise := false

	// Replace common formatting characters with spaces so we can isolate numbers
	cleanS := strings.ReplaceAll(s, "[", " ")
	cleanS = strings.ReplaceAll(cleanS, "]", " ")
	cleanS = strings.ReplaceAll(cleanS, ",", " ")

	words := strings.Fields(cleanS)
	for _, w := range words {
		if n, err := strconv.ParseFloat(w, 64); err == nil {
			nums = append(nums, n)
		} else {
			// This word is not a number -> it's "Noise"
			hasNoise = true
		}
	}
	return nums, hasNoise
}
