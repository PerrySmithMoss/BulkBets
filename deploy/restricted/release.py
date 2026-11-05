#!/usr/bin/python3 -I
"""Root-owned release broker. Never execute source supplied by a CI checkout."""
import fcntl
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile

ROOT = Path('/opt/bulkbets-release')
IMAGE = 'ghcr.io/perrysmithmoss/bulkbets'


def validate_args(args):
    if len(args) != 2 or not re.fullmatch(r'[0-9a-f]{40}', args[0]) or not re.fullmatch(r'sha256:[0-9a-f]{64}', args[1]):
        raise ValueError('Expected a full commit SHA and sha256 image digest.')
    return args[0], args[1]


def credentials(raw):
    if len(raw) > 8192:
        raise ValueError('Registry authentication is too large.')
    value = json.loads(raw)
    if not isinstance(value, dict) or set(value) != {'username', 'token'}:
        raise ValueError('Expected registry username and temporary token only.')
    if not isinstance(value['username'], str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9-]{0,99}', value['username']):
        raise ValueError('Invalid registry username.')
    if not isinstance(value['token'], str) or not re.fullmatch(r'[A-Za-z0-9_.-]{20,4096}', value['token']):
        raise ValueError('Invalid registry token.')
    return value


def main():
    sha, digest = validate_args(sys.argv[1:])
    if os.geteuid() != 0:
        raise ValueError('The broker must run through its restricted sudo rule.')
    os.umask(0o077)
    # Prevent an idle SSH client from holding a root process indefinitely.
    signal.alarm(30)
    auth = credentials(sys.stdin.buffer.readline(8194))
    signal.alarm(0)
    with open('/run/lock/bulkbets-release.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        with tempfile.TemporaryDirectory(prefix='bulkbets-registry-', dir='/run') as registry:
            env = {
                'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'HOME': '/root',
                'DOCKER_HOST': 'unix:///var/run/docker.sock', 'DOCKER_CONFIG': registry,
                'GIT_COMMIT_HASH': sha, 'API_IMAGE': f'{IMAGE}@{digest}',
                'PROVISION_DATABASE': 'false',
            }
            subprocess.run(['/usr/bin/docker', 'login', 'ghcr.io', '--username', auth['username'], '--password-stdin'],
                           input=auth['token'], text=True, env=env, check=True, timeout=60,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(['/usr/bin/docker', 'pull', env['API_IMAGE']], env=env, check=True, timeout=180,
                           stdout=subprocess.DEVNULL)
            revision = subprocess.check_output(['/usr/bin/docker', 'image', 'inspect', '--format',
                                                '{{index .Config.Labels "org.opencontainers.image.revision"}}', env['API_IMAGE']],
                                               env=env, text=True, timeout=30).strip()
            if revision != sha:
                raise ValueError('Image revision does not match the requested release.')
            # Both files and their parent directories are root-owned; the SSH
            # account cannot supply flags, paths, shell text or new manifests.
            subprocess.run(['/bin/sh', '-c', 'set -a; . ./deployment.env; exec /bin/sh deploy/rollout.sh'],
                           cwd=ROOT, env=env, check=True, timeout=2400)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.SubprocessError):
        # Never include credentials or raw subprocess input in SSH output.
        print('Release rejected or failed. Check the root-owned release configuration and service health.', file=sys.stderr)
        sys.exit(1)
