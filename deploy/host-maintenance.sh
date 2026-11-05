#!/bin/sh
# Reviewed maintenance for this single-node VPS. Requires the owner's sudo login.
set -eu
[ "$(id -u)" = 0 ] || { echo 'Run with sudo.' >&2; exit 1; }
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
test "$(docker node ls -q | wc -l)" -eq 1 || { echo 'Expected the audited single-node Swarm.' >&2; exit 1; }
sshd -t
curl --fail --silent --show-error https://bulkbets-api.perrysmithmoss.com/api/v1/health
# Keep working TCP access before removing the broader TCP+UDP rules.
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force delete allow 80
ufw --force delete allow 443
# TCP forwarding remains available to the owner's administrator login. New CI
# accounts have DisableForwarding and forced commands installed separately.
install -d -m 755 /etc/systemd/resolved.conf.d
printf '[Resolve]\nLLMNR=no\nMulticastDNS=no\n' > /etc/systemd/resolved.conf.d/60-vps-no-multicast.conf
systemctl restart systemd-resolved
getent hosts deb.debian.org >/dev/null
apt-get update
# Explicit package set: no distribution upgrade or automatic reboot.
apt-get install --only-upgrade -y containerd.io docker-ce docker-ce-cli docker-ce-rootless-extras docker-buildx-plugin docker-compose-plugin nodejs
systemctl is-active docker ssh ufw fail2ban unattended-upgrades
for attempt in $(seq 1 60); do
  if curl --fail --silent --show-error https://bulkbets-api.perrysmithmoss.com/api/v1/health; then
    docker service ls
    sshd -T | awk '/^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication) /'
    ufw status verbose
    if [ -e /var/run/reboot-required ]; then echo 'A reboot is required; schedule it separately.'; fi
    exit 0
  fi
  sleep 5
done
echo 'API health did not recover within five minutes. Inspect Docker services before further changes.' >&2
exit 1
