package env

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSecretFilesPreservePasswordSpacesAndTrimLineEndings(t *testing.T) {
	path := filepath.Join(t.TempDir(), "secret")
	if err := os.WriteFile(path, []byte(" password with spaces \n"), 0600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("BULKBETS_TEST_SECRET", "")
	t.Setenv("BULKBETS_TEST_SECRET_FILE", path)
	if err := LoadSecretFiles("BULKBETS_TEST_SECRET"); err != nil {
		t.Fatal(err)
	}
	if os.Getenv("BULKBETS_TEST_SECRET") != " password with spaces " {
		t.Fatal("secret was changed")
	}
}

func TestSecretFileRejectsAmbiguousMissingAndEmptySecrets(t *testing.T) {
	t.Setenv("BULKBETS_TEST_SECRET", "do-not-log-this-value")
	t.Setenv("BULKBETS_TEST_SECRET_FILE", "/missing/secret")
	if err := LoadSecretFiles("BULKBETS_TEST_SECRET"); err == nil || strings.Contains(err.Error(), "do-not-log-this-value") {
		t.Fatal("ambiguous configuration was accepted or leaked")
	}
	t.Setenv("BULKBETS_TEST_SECRET", "")
	if err := LoadSecretFiles("BULKBETS_TEST_SECRET"); err == nil {
		t.Fatal("missing file accepted")
	}
	path := filepath.Join(t.TempDir(), "secret")
	if err := os.WriteFile(path, []byte("\n"), 0600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("BULKBETS_TEST_SECRET_FILE", path)
	if err := LoadSecretFiles("BULKBETS_TEST_SECRET"); err == nil {
		t.Fatal("empty secret accepted")
	}
}
