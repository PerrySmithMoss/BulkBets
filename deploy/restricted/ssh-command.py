#!/usr/bin/python3 -I
"""Forced command for the dedicated account; no interactive shell or Docker API."""
import os
import re
import sys

match = re.fullmatch(r'release ([0-9a-f]{40}) (sha256:[0-9a-f]{64})', os.environ.get('SSH_ORIGINAL_COMMAND', ''))
if not match:
    print('Only the BulkBets release command is allowed.', file=sys.stderr)
    sys.exit(1)
os.execv('/usr/bin/sudo', ['/usr/bin/sudo', '-n', '/usr/local/libexec/bulkbets-release', *match.groups()])
