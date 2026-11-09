# Restricted production releases

The `bulkbets-release` SSH account is not in `docker` or `sudo`. A root-owned
forced command accepts only `release <40-character commit> sha256:<64 hex digits>`.
One narrow sudo rule invokes the broker, which independently validates both
arguments, pulls the immutable image from the BulkBets GHCR namespace and checks
its revision label. It executes a root-owned deployment snapshot, never scripts
or compose files supplied by CI. SSH shells, SFTP, forwarding and Docker API
tunnelling are rejected. A host lock serializes releases.

The registry token arrives as one bounded JSON line on stdin, is held in a
temporary root-only Docker configuration under `/run`, and is deleted when the
release exits. Use the workflow's short-lived GITHUB_TOKEN. It is never a shell
argument or logged input.

Ordinary releases run schema migrations, seed migrations and runtime grants
using the application owner role. They do **not** run database provisioning or
mount shared PostgreSQL administrator/provisioner credentials. Migration jobs
are non-root, read-only, capability-free and resource-limited. A malicious
application image can still access BulkBets's own data and secrets: this boundary
limits host/shared-infrastructure authority, not application release authority.
The revision label is consistency checking, not signed provenance.

## Installation and cutover

Build the two host executables from a clean, reviewed checkout in a trusted
build environment. Use the Go version pinned in `deploy/restricted/go.mod`
(Go 1.27.3). From the repository root:

```sh
artifacts=$(mktemp -d)
GOTOOLCHAIN=local GOOS=linux GOARCH=amd64 CGO_ENABLED=0 \
  go -C deploy/restricted build -trimpath -buildvcs=true -o "$artifacts/" ./cmd/...
go version -m "$artifacts/bulkbets-release" "$artifacts/bulkbets-ssh-command"
(cd "$artifacts" && sha256sum bulkbets-release bulkbets-ssh-command > SHA256SUMS)
```

Check the recorded revision, clean build state, and target architecture in
the Go build metadata. Record the checksums in the trusted build environment.
Copy the binaries and reviewed checkout to an administrator-controlled location
on the VPS, then verify the binaries with `sha256sum -c SHA256SUMS` against the
trusted checksums before running the installer.

1. For an upgrade, keep a root-only copy of `/opt/bulkbets-release` and the
   current `/usr/local/libexec/bulkbets-release` and `bulkbets-ssh-command`
   executables. Install while no release is running. The installer uses the same
   lock as the broker. From the reviewed checkout, run
   `sudo sh deploy/restricted/install.sh /path/to/release.pub /path/to/artifacts`.
   Reuse the existing dedicated CI public key when upgrading. For a new
   installation, create a dedicated Ed25519 key and keep its private key in
   the `production` environment as `BULKBETS_RELEASE_KEY`.
2. Verify that the release account rejects `id`, `docker system dial-stdio`,
   SFTP, extra arguments and forwarding. Confirm root ownership of
   `/opt/bulkbets-release` and both executables in `/usr/local/libexec`.
3. Keep the protected production workflow restricted to `master` with passing
   PR checks. Verify a real release through it, including public API health,
   the selected SMTP secret mapping and frontend promotion after the API.
4. Verify that the retired `deploy` account remains blocked and that its
   shared key is absent from CI. Use the separate owner administrator login
   for recovery.

For rollback, use the owner login during a quiet deployment window. Hold
`/run/lock/bulkbets-release.lock` with `flock`, restore the saved snapshot
with its original ownership and permissions, and replace both saved
executables at the same paths using a staged copy and rename. The SSH command
and sudo target are identical across versions. Repeat the restricted SSH checks
and verify a protected release after restoring. Keep system Python available
while the saved Python version is a rollback option.

Install future deployment-policy changes using administrator access after
review. CI cannot refresh the root-owned snapshot. An application code release
does not need a new snapshot when the deployment policy is unchanged. CI only
uses the restricted broker. Keep the separate owner administrator login for
recovery.

No scheduled backups are installed. The owner explicitly declined them.

## SMTP credential rotation

Create a versioned Swarm secret from the new sending-only credential, then set
`SMTP_PASSWORD_SECRET` in the administrator-reviewed `deployment.env` snapshot.
The SMTP overlay keeps the container target `/run/secrets/bulkbets_smtp_password`
stable while selecting the new external secret name. Reinstall the root-owned
snapshot before releasing; CI cannot change this mapping. Verify STARTTLS and
authentication without sending a message, and retain the previous secret until
the updated service is healthy. Never put the credential value in Git.
