#!/bin/sh
# Read-only administrator diagnostics. No keys, passwords or environment values.
set -eu
if [ "$(id -u)" -ne 0 ]; then
  echo 'Run with sudo on the VPS to inspect effective host security.' >&2
  exit 1
fi
uname -r
sshd -T | awk '/^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication|authenticationmethods|allowusers|allowgroups|x11forwarding|allowtcpforwarding|permituserenvironment|usepam) /'
ufw status verbose
nft list ruleset
ss -lntup
systemctl is-active ufw fail2ban unattended-upgrades docker
apt list --upgradable 2>/dev/null
