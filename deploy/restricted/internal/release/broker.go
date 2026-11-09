package release

import (
	"context"
	"errors"
	"io"
	"os"
	"os/exec"
	"strings"
	"syscall"
	"time"
)

const image = "ghcr.io/perrysmithmoss/bulkbets"

type broker struct {
	root, lockPath, registryRoot, docker string
}

func Run(args []string, input io.Reader, stdout, stderr io.Writer) error {
	if !validArgs(args) || os.Geteuid() != 0 {
		return errors.New("expected a root release with a full commit SHA and image digest")
	}
	syscall.Umask(0o077)
	auth, err := readCredentials(input, 30*time.Second)
	if err != nil {
		return err
	}
	host := broker{
		root: "/opt/bulkbets-release", lockPath: "/run/lock/bulkbets-release.lock",
		registryRoot: "/run", docker: "/usr/bin/docker",
	}
	return host.release(args[0], args[1], auth, stdout, stderr)
}

func (b broker) release(sha, digest string, auth credentials, stdout, stderr io.Writer) (err error) {
	lock, err := os.OpenFile(b.lockPath, os.O_CREATE|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	defer lock.Close()
	if err := syscall.Flock(int(lock.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		return err
	}

	registry, err := os.MkdirTemp(b.registryRoot, "bulkbets-registry-")
	if err != nil {
		return err
	}
	defer func() { err = errors.Join(err, os.RemoveAll(registry)) }()
	ref := image + "@" + digest
	env := []string{
		"PATH=/usr/sbin:/usr/bin:/sbin:/bin", "HOME=/root",
		"DOCKER_HOST=unix:///var/run/docker.sock", "DOCKER_CONFIG=" + registry,
		"GIT_COMMIT_HASH=" + sha, "API_IMAGE=" + ref, "PROVISION_DATABASE=false",
	}

	login, cancel := command(60*time.Second, env, b.docker, "login", "ghcr.io", "--username", auth.username, "--password-stdin")
	defer cancel()
	login.Stdin = strings.NewReader(auth.token)
	if err := login.Run(); err != nil {
		return err
	}

	pull, cancel := command(180*time.Second, env, b.docker, "pull", ref)
	defer cancel()
	pull.Stderr = stderr
	if err := pull.Run(); err != nil {
		return err
	}

	inspect, cancel := command(30*time.Second, env, b.docker, "image", "inspect", "--format",
		`{{index .Config.Labels "org.opencontainers.image.revision"}}`, ref)
	defer cancel()
	revision, err := inspect.Output()
	if err != nil {
		return err
	}
	if strings.TrimSpace(string(revision)) != sha {
		return errors.New("image revision does not match the requested release")
	}

	// The shell text and working directory are fixed. The snapshot is root-owned.
	rollout, cancel := command(2400*time.Second, env, "/bin/sh", "-c",
		"set -a; . ./deployment.env; exec /bin/sh deploy/rollout.sh")
	defer cancel()
	rollout.Dir = b.root
	rollout.Stdout, rollout.Stderr = stdout, stderr
	return rollout.Run()
}

func command(timeout time.Duration, env []string, name string, args ...string) (*exec.Cmd, context.CancelFunc) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Env = env
	// Time out the whole command, including children of the rollout shell.
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Cancel = func() error {
		err := syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
		if errors.Is(err, syscall.ESRCH) {
			return os.ErrProcessDone
		}
		return err
	}
	cmd.WaitDelay = 5 * time.Second
	return cmd, cancel
}
