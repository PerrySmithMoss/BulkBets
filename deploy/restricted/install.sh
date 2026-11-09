#!/bin/sh
# Run from a reviewed copy of this repository as root. Installs only the broker.
set -eu
PATH=/usr/sbin:/usr/bin:/sbin:/bin
export PATH
[ "$(id -u)" = 0 ] && [ "$#" = 2 ] || {
  echo 'Usage (as root): install.sh PUBLIC_KEY ARTIFACT_DIR' >&2
  exit 1
}
key=$(cat -- "$1")
artifacts=$(CDPATH='' cd -- "$2" && pwd)
cd "$(dirname "$0")/../.."
printf '%s\n' "$key" | grep -Eq '^ssh-ed25519 [A-Za-z0-9+/=]+( [^[:cntrl:]]*)?$' || { echo 'Expected one Ed25519 public key.' >&2; exit 1; }
[ "$(printf '%s\n' "$key" | wc -l)" -eq 1 ] || exit 1
for command in docker sudo sshd flock; do command -v "$command" >/dev/null; done
for binary in bulkbets-release bulkbets-ssh-command; do
  [ -f "$artifacts/$binary" ] && [ -x "$artifacts/$binary" ] || {
    echo "Missing executable: $artifacts/$binary" >&2
    exit 1
  }
done
umask 077
exec 9>>/run/lock/bulkbets-release.lock
flock -n 9 || { echo 'A BulkBets release or installation is in progress.' >&2; exit 1; }
install -d -o root -g root -m 755 /usr/local/libexec
staging=$(mktemp -d /usr/local/libexec/.bulkbets-release.XXXXXX)
trap 'rm -rf -- "$staging"' EXIT
trap 'exit 1' HUP INT TERM
for binary in bulkbets-release bulkbets-ssh-command; do
  install -o root -g root -m 755 -- "$artifacts/$binary" "$staging/$binary"
done
if ! id bulkbets-release >/dev/null 2>&1; then
  useradd --system --user-group --home-dir /var/lib/bulkbets-release --shell /bin/sh --password '*' bulkbets-release
fi
[ "$(id -nG bulkbets-release)" = bulkbets-release ] || { echo 'Release account has unexpected supplementary groups.' >&2; exit 1; }
install -d -o root -g root -m 755 /opt/bulkbets-release /opt/bulkbets-release/deploy /var/lib/bulkbets-release /var/lib/bulkbets-release/.ssh
install -o root -g root -m 644 docker-stack.yaml /opt/bulkbets-release/
install -o root -g root -m 644 deploy/rollout.sh deploy/migrate.sh deploy/docker-stack.smtp.yml /opt/bulkbets-release/deploy/
install -o root -g root -m 600 deploy/restricted/deployment.env /opt/bulkbets-release/deployment.env
for binary in bulkbets-release bulkbets-ssh-command; do
  mv -f -- "$staging/$binary" "/usr/local/libexec/$binary"
done
printf 'restrict,command="/usr/local/libexec/bulkbets-ssh-command" %s\n' "$key" > /var/lib/bulkbets-release/.ssh/authorized_keys
chmod 644 /var/lib/bulkbets-release/.ssh/authorized_keys
printf '%s\n' 'bulkbets-release ALL=(root) NOPASSWD: /usr/local/libexec/bulkbets-release *' > /etc/sudoers.d/bulkbets-release
chmod 440 /etc/sudoers.d/bulkbets-release
visudo -cf /etc/sudoers.d/bulkbets-release
cat > /etc/ssh/sshd_config.d/10-bulkbets-release.conf <<'CONFIG'
Match User bulkbets-release
    AuthenticationMethods publickey
    PasswordAuthentication no
    KbdInteractiveAuthentication no
    PermitTTY no
    DisableForwarding yes
    PermitUserRC no
    ForceCommand /usr/local/libexec/bulkbets-ssh-command
Match all
CONFIG
sshd -t
systemctl reload ssh
echo 'Broker installed. Verify restricted SSH access and a real release through protected CI.'
