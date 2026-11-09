package release

import (
	"bufio"
	"encoding/json"
	"errors"
	"io"
	"regexp"
	"time"
)

var (
	commitPattern  = regexp.MustCompile(`^[0-9a-f]{40}$`)
	digestPattern  = regexp.MustCompile(`^sha256:[0-9a-f]{64}$`)
	commandPattern = regexp.MustCompile(`^release ([0-9a-f]{40}) (sha256:[0-9a-f]{64})$`)
	userPattern    = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9-]{0,99}$`)
	tokenPattern   = regexp.MustCompile(`^[A-Za-z0-9_.-]+$`)
)

func SSHArgs(command string) []string {
	match := commandPattern.FindStringSubmatch(command)
	if match == nil {
		return nil
	}
	return match[1:]
}

func validArgs(args []string) bool {
	return len(args) == 2 && commitPattern.MatchString(args[0]) && digestPattern.MatchString(args[1])
}

type credentials struct {
	username string
	token    string
}

func readCredentials(input io.Reader, timeout time.Duration) (credentials, error) {
	const limit = 8192
	type result struct {
		auth credentials
		err  error
	}
	results := make(chan result, 1)
	// SSH stdin can be a blocking pipe. On timeout the broker returns and exits.
	go func() {
		raw, err := bufio.NewReader(io.LimitReader(input, limit+1)).ReadBytes('\n')
		if (err != nil && !errors.Is(err, io.EOF)) || len(raw) > limit {
			results <- result{err: errors.New("cannot read bounded registry credentials")}
			return
		}

		var fields map[string]string
		if json.Unmarshal(raw, &fields) != nil || len(fields) != 2 ||
			!userPattern.MatchString(fields["username"]) || !validToken(fields["token"]) {
			results <- result{err: errors.New("invalid registry credentials")}
			return
		}
		results <- result{auth: credentials{username: fields["username"], token: fields["token"]}}
	}()
	timer := time.NewTimer(timeout)
	defer timer.Stop()
	select {
	case result := <-results:
		return result.auth, result.err
	case <-timer.C:
		return credentials{}, errors.New("registry credentials timed out")
	}
}

func validToken(token string) bool {
	return len(token) >= 20 && len(token) <= 4096 && tokenPattern.MatchString(token)
}
