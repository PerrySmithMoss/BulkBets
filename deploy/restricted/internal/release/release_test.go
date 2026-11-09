package release

import (
	"bytes"
	"io"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"syscall"
	"testing"
	"time"
)

var (
	testSHA    = strings.Repeat("a", 40)
	testDigest = "sha256:" + strings.Repeat("b", 64)
)

func TestReleaseArguments(t *testing.T) {
	valid := []string{testSHA, testDigest}
	if !validArgs(valid) || !reflect.DeepEqual(SSHArgs("release "+strings.Join(valid, " ")), valid) {
		t.Fatal("rejected a valid release")
	}
	for _, args := range [][]string{
		nil, {testSHA}, {testSHA, testDigest, "extra"}, {"main", testDigest},
		{testSHA + ";id", testDigest}, {testSHA, "latest"}, {testSHA, testDigest + "\n"},
		{"--help", testDigest}, {testSHA, "evil.example/image@" + testDigest},
	} {
		if validArgs(args) || SSHArgs("release "+strings.Join(args, " ")) != nil {
			t.Errorf("accepted invalid arguments %q", args)
		}
	}
	for _, command := range []string{"", "id", "docker system dial-stdio", "internal-sftp", "release " + testSHA + " " + testDigest + ";id"} {
		if SSHArgs(command) != nil {
			t.Errorf("accepted SSH command %q", command)
		}
	}
}

func TestCredentials(t *testing.T) {
	token := strings.Repeat("x", 30)
	valid := `{"username":"ci-user","token":"` + token + `"}`
	for _, input := range []string{valid, valid + "\nignored", valid + strings.Repeat(" ", 8192-len(valid))} {
		auth, err := readCredentials(strings.NewReader(input), time.Second)
		if err != nil || auth != (credentials{username: "ci-user", token: token}) {
			t.Fatal("rejected valid registry credentials")
		}
	}
	for _, input := range []string{
		`[]`, `{"username":"ci-user","token":null}`, `{"username":`, valid + `{}`,
		`{"username":"ci-user","token":"` + token + `","DOCKER_HOST":"tcp://evil"}`,
		`{"username":"--config=/tmp","token":"` + token + `"}`,
		`{"username":"ci-user","token":"` + token + `\n"}`,
		valid + strings.Repeat(" ", 8193-len(valid)),
	} {
		if _, err := readCredentials(strings.NewReader(input), time.Second); err == nil {
			t.Error("accepted invalid registry credentials")
		}
	}
	for _, length := range []int{19, 20, 4096, 4097} {
		input := strings.Replace(valid, token, strings.Repeat("x", length), 1)
		_, err := readCredentials(strings.NewReader(input), time.Second)
		if (err == nil) != (length == 20 || length == 4096) {
			t.Errorf("unexpected validation result at token length %d", length)
		}
	}
	r, w := io.Pipe()
	defer r.Close()
	defer w.Close()
	if _, err := readCredentials(r, 20*time.Millisecond); err == nil {
		t.Fatal("idle stdin should time out")
	}
}

func TestReleaseLock(t *testing.T) {
	root := t.TempDir()
	lockPath := filepath.Join(root, "release.lock")
	lock, err := os.Create(lockPath)
	if err != nil {
		t.Fatal(err)
	}
	defer lock.Close()
	if err := syscall.Flock(int(lock.Fd()), syscall.LOCK_EX); err != nil {
		t.Fatal(err)
	}
	b := broker{lockPath: lockPath, registryRoot: root}
	if err := b.release(testSHA, testDigest, credentials{}, io.Discard, io.Discard); err != syscall.EWOULDBLOCK {
		t.Fatalf("wanted an exclusive lock error, got %v", err)
	}
}

func TestReleaseVerifiesImageAndCleansCredentials(t *testing.T) {
	for _, stage := range []string{"ok", "login", "pull", "revision", "rollout"} {
		t.Run(stage, func(t *testing.T) {
			root := t.TempDir()
			t.Setenv("DOCKER_CONTEXT", "untrusted")
			t.Setenv("DOCKER_HOST", "tcp://untrusted")
			// A fixture for the host-owned Docker executable. Its assertions fail
			// before rollout if the broker passes unexpected arguments or credentials.
			docker := `#!/bin/sh
set -eu
[ -z "${DOCKER_CONTEXT:-}" ]
[ "$DOCKER_HOST" = unix:///var/run/docker.sock ]
[ "$API_IMAGE" = 'ghcr.io/perrysmithmoss/bulkbets@` + testDigest + `' ]
[ "$GIT_COMMIT_HASH" = '` + testSHA + `' ]
[ "$PROVISION_DATABASE" = false ]
[ "$(ls -ld "$DOCKER_CONFIG" | cut -c1-10)" = drwx------ ]
case "$1" in
  login)
    [ "$*" = "login ghcr.io --username ci-user --password-stdin" ]
    printf '%s\n' "$DOCKER_CONFIG" >"${DOCKER_CONFIG%/*}/registry-path"
    cat >"$DOCKER_CONFIG/config.json"
    [ "$(cat "$DOCKER_CONFIG/config.json")" = "secret-for-test-only" ]
    cat "$DOCKER_CONFIG/config.json"
    cat "$DOCKER_CONFIG/config.json" >&2
    [ "` + stage + `" != login ]
    ;;
  pull)
    [ "$#" = 2 ] && [ "$2" = "$API_IMAGE" ]
    [ "` + stage + `" != pull ]
    ;;
  image)
    [ "$#" = 5 ] && [ "$2" = inspect ] && [ "$3" = --format ] && [ "$5" = "$API_IMAGE" ]
    if [ "` + stage + `" = revision ]; then
      echo wrong-revision
    else
      echo "$GIT_COMMIT_HASH"
    fi
    ;;
  *) exit 1 ;;
esac
`
			writeFile(t, filepath.Join(root, "docker"), docker, 0o700)
			if err := os.Mkdir(filepath.Join(root, "deploy"), 0o700); err != nil {
				t.Fatal(err)
			}
			writeFile(t, filepath.Join(root, "deployment.env"), "SNAPSHOT=reviewed\n", 0o600)
			writeFile(t, filepath.Join(root, "deploy", "rollout.sh"), `set -eu
[ "$SNAPSHOT" = reviewed ]
[ "$PROVISION_DATABASE" = false ]
printf '%s\n' rollout
[ "`+stage+`" != rollout ]
`, 0o600)

			b := broker{root: root, lockPath: filepath.Join(root, "release.lock"), registryRoot: root, docker: filepath.Join(root, "docker")}
			var output bytes.Buffer
			err := b.release(testSHA, testDigest, credentials{"ci-user", "secret-for-test-only"}, &output, &output)
			if (err == nil) != (stage == "ok") {
				t.Fatalf("release returned %v at stage %s", err, stage)
			}
			expectedOutput := ""
			if stage == "ok" || stage == "rollout" {
				expectedOutput = "rollout\n"
			}
			if output.String() != expectedOutput {
				t.Fatal("unexpected output or rollout after a failed image check")
			}
			path, err := os.ReadFile(filepath.Join(root, "registry-path"))
			if err != nil {
				t.Fatal(err)
			}
			if _, err := os.Stat(strings.TrimSpace(string(path))); !os.IsNotExist(err) {
				t.Fatalf("temporary registry configuration was not removed: %v", err)
			}
		})
	}
}

func TestCommandTimeoutStopsChild(t *testing.T) {
	root := t.TempDir()
	cmd, cancel := command(200*time.Millisecond, []string{"PATH=/usr/bin:/bin"}, "/bin/sh", "-c",
		`touch started; (sleep 0.5; touch survived) & wait`)
	defer cancel()
	cmd.Dir = root
	if err := cmd.Run(); err == nil {
		t.Fatal("command should time out")
	}
	if _, err := os.Stat(filepath.Join(root, "started")); err != nil {
		t.Fatal("child fixture did not start")
	}
	time.Sleep(600 * time.Millisecond)
	if _, err := os.Stat(filepath.Join(root, "survived")); !os.IsNotExist(err) {
		t.Fatalf("timed-out command left a child running: %v", err)
	}
}

func writeFile(t *testing.T, path, content string, mode os.FileMode) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), mode); err != nil {
		t.Fatal(err)
	}
}
