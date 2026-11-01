package main

import (
	"testing"
	"time"
)

func TestRegistrationValidation(t *testing.T) {
	now := time.Date(2026, 11, 1, 12, 0, 0, 0, time.UTC)
	for _, tc := range []struct {
		dob   string
		valid bool
	}{
		{"2008-11-01", true}, {"2008-11-02", false}, {"2030-01-01", false},
		{"2000-02-30", false}, {"", false}, {"1899-01-01", false},
	} {
		if _, valid := adultDate(tc.dob, now); valid != tc.valid {
			t.Errorf("dob %q: got %v", tc.dob, valid)
		}
	}
	for _, email := range []string{"bad", "Person <person@example.com>", "x@example.com\r\nBcc: a@example.com"} {
		if validEmail(email) {
			t.Errorf("accepted invalid email %q", email)
		}
	}
	if !validEmail("person@example.com") || validPassword("short") || !validPassword("a-long-password-123") {
		t.Fatal("invalid credential validation")
	}
}
