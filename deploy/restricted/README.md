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

1. Review and copy the deployment snapshot and a new dedicated Ed25519 **public**
   key to the VPS. Run `sudo sh deploy/restricted/install.sh ./release.pub` from
   that snapshot. The install does not alter the existing `deploy` account.
2. Verify that the new account rejects `id`, `docker system dial-stdio`, SFTP,
   extra arguments and forwarding. Confirm root ownership of `/opt/bulkbets-release`
   and `/usr/local/libexec/bulkbets-*`.
3. Store the corresponding private key as `BULKBETS_RELEASE_KEY` in this repo's
   `production` environment. Restrict that environment to `master` and require
   owner approval. Do not duplicate this credential at repository scope.
   Set repository variable `RESTRICTED_DEPLOY_ENABLED=true`. Deploy the updated
   workflow and verify a complete release and public health checks.
4. Remove the old `DEPLOY_SSH_PRIVATE_KEY` repository secret. Do not remove the
   shared VPS `deploy` key until its other application users have migrated.
   That shared account remains host-privileged for those other services.

Install future deployment-policy changes using administrator access after
review. CI cannot refresh the root-owned snapshot. An application code release
does not need a new snapshot when the deployment policy is unchanged. The
legacy workflow path exists only for cutover; after removing its key it fails
closed if the feature variable is accidentally unset.

No scheduled backups are installed. The owner explicitly declined them.

## SMTP credential rotation

Create a versioned Swarm secret from the new sending-only credential, then set
`SMTP_PASSWORD_SECRET` in the administrator-reviewed `deployment.env` snapshot.
The SMTP overlay keeps the container target `/run/secrets/bulkbets_smtp_password`
stable while selecting the new external secret name. Reinstall the root-owned
snapshot before releasing; CI cannot change this mapping. Verify STARTTLS and
authentication without sending a message, and retain the previous secret until
the updated service is healthy. Never put the credential value in Git.
