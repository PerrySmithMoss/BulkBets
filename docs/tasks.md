# Tasks

## Order for the remaining work

Track automatic verification of the revision served by the public Vercel domain
in [BulkBets issue #19](https://github.com/PerrySmithMoss/BulkBets/issues/19).

1. On 12 November 2026, check for a new official PostgreSQL 17 Bookworm image
   and [prepare the switch](#switch-to-the-official-postgresql-17-image) if it
   passes verification. Review the remaining Debian findings with the
   infrastructure maintainer on the same date.
2. Address the remaining high findings in the app API images. Prioritize
   available runtime fixes. See the
   [patched image scans](security-evidence-2026-11-05.md#patched-legacy-api-images).
3. Isolate each legacy app's Swarm network one at a time. Verify ingress,
   database access and rollback before removing its shared network attachment.
4. Recheck Expo and TypeScript ESLint for compatible fixes. Run mobile
   exports, lint, type checks and browser coverage before updating the lockfiles.
5. Confirm the homepage redirect after a successful production password reset
   before changing the email template.
6. Migrate the existing BulkBets and perry-infra Python brokers to Go after
   the release and recovery paths are stable. Roll them out separately.

## Switch to the official PostgreSQL 17 image

- [ ] Check Docker Hub for a newer official `postgres:17-bookworm` image on
  12 November 2026. Confirm the PostgreSQL release and resolve the exact digest
  for the VPS architecture. If the image has not been published, record that
  result and wait for the upstream build.
- [ ] Scan the digest and retain the full report. Test startup on disposable
  data initialized by PostgreSQL 17 and on an empty volume. Verify extensions,
  UTF-8, locale, collation, TLS and access with each app's role. The official
  image includes `gosu`, which the stack skips by starting as UID 999. Keep
  any reported `gosu` entries visible and document their applicability.
- [ ] If checks pass, pin the digest in `perry-infra` and deploy through the
  administrator-installed snapshot and protected production workflow. Reuse
  the current data volume. Verify the running digest and database identity,
  the BulkBets market directory, Chinwag and VitaTrack login lookups, and TLS
  connections for all three app roles. The owner accepts a fresh start if the
  existing data becomes unusable.
- [ ] Review the remaining Debian findings separately from the image switch.
  Start with the linked `libxml2` library and check for upstream fixes and app
  paths to the affected XML parser. Owner: infrastructure maintainer. Review
  date: 12 November 2026. See the
  [production scan and findings](security-evidence-2026-11-05.md#postgresql-production-rollout).

## Replace Python deployment tooling with Go

- [ ] Migrate the restricted deployment tooling to Go while preserving its
  security boundaries and production behaviour.

  Use Go for the privileged brokers, SSH command validation and their tests,
  aligning with the existing backend stack. Keep existing TypeScript development
  and test tooling; this task does not require rewriting unrelated shell scripts.
  The purpose is language consistency and maintainability, not a claim that a
  language change alone improves security.

  - Replace `deploy/restricted/release.py`, `ssh-command.py` and
    `test_release.py` with Go commands and tests.
  - Coordinate the equivalent migration in `perry-infra`: `deploy/broker.py`,
    `ssh-command.py`, `fingerprint.py`, `test_broker.py`, and inline Python in
    the installer. Preserve the exact fingerprint format and file ordering so
    CI and the host agree on the administrator-reviewed infrastructure snapshot.
  - Preserve strict command/argument validation, immutable image references and
    revision checks, bounded credential input, input/process timeouts, exclusive
    release locking, a clean subprocess environment, private temporary registry
    credentials and cleanup on failure. Never log credentials or accept
    CI-supplied shell commands, paths or deployment manifests.
  - Preserve root ownership of installed binaries and deployment snapshots,
    narrowly scoped sudo rules, SSH forced commands, disabled forwarding and
    the separation between application migrations and infrastructure provisioning.
  - Build Linux/amd64 executables using a pinned Go toolchain in a trusted build
    environment. Install reviewed artifacts as administrator; do not give CI
    permission to replace its own broker or host-owned configuration. Document
    artifact verification and rollback to the previous installed version.
  - Update both repositories' installers, CI checks, fingerprint invocation and
    deployment documentation. Remove obsolete Python files and deployment-tool
    runtime requirements after successful cutover; do not uninstall the VPS's
    system Python or affect unrelated services.
  - Port the existing boundary tests and cover malformed/oversized credentials,
    extra arguments, shell injection, timeouts, concurrent releases, failed
    subprocess cleanup and fingerprint compatibility. Verify Go binaries reject
    shell commands, Docker socket tunnelling, SFTP and forwarding under the real
    restricted SSH accounts.
  - Roll out one broker at a time with an administrator-installed snapshot and
    a rollback plan. Complete a real application release and infrastructure
    deployment through their protected workflows, then verify service health,
    SMTP secret mapping and frontend promotion without weakening existing gates.

  The Go ports, CI checks and administrator install instructions are ready for
  review. Production cutover remains open until each broker is installed
  separately and verified through its protected deployment workflow.

  Done when both deployment paths use tested Go executables, their security
  restrictions and production releases are verified, and no maintained Python
  code remains in this deployment-tooling scope.

## Resolve remaining vulnerabilities

- [ ] Address the upstream vulnerability findings identified in the
  [security follow-up report](security-follow-up-2026-11-05.md#open-items-and-accepted-limits).

  Coordinate changes across BulkBets, `perry-infra` and the other applications
  on the VPS. Use the report as a dated baseline; refresh the evidence before
  choosing upgrades or deciding that a finding still has no upstream fix.

  - [ ] Refresh scans when evaluating fixes for the findings in the
    [security evidence](security-evidence-2026-11-05.md). Record advisory IDs,
    affected and fixed versions, dependency paths and vendor guidance.
    Distinguish scanner entries from demonstrated reachability and exploitability.
  - [ ] Resolve the remaining glob/minimatch and other npm findings through
    compatible upstream updates or deliberately tested dependency migrations.
    Avoid forced downgrades or overrides that merely make the audit count lower.
    Validate web/mobile lint, types, unit tests, browser tests and native exports
    for the affected dependency changes.
  - [ ] Track the [PostgreSQL image update and Debian findings](#switch-to-the-official-postgresql-17-image).
    If a later change requires a different base distribution, check for
    collation changes and any index rebuilds on disposable data before rollout.
  - [ ] Keep existing vulnerability gates and full scan artifacts. For findings
    without a safe fix, document affected versions, reachability, mitigation,
    upstream tracking, an owner and a review date. Obtain explicit acceptance of
    any residual risk; leave unresolved findings visibly tracked until patched
    or accepted, rather than treating a passing gate as a clean full report.

  Done when every refreshed vulnerability finding is remediated or explicitly
  accepted with evidence, mitigation and a review date. Keep unresolved findings
  visible in scan reports and tracking.

## Remediate the remaining Chinwag API image findings

- [ ] Review the 45 high findings from the patched image scan for Debian fixes
  and reachable runtime issues. Verify image scanning, migrations, sign-in and
  messaging for any update.

## Remediate the remaining Fleet API image findings

- [ ] Review the 45 high findings from the patched image scan for Debian fixes
  and reachable runtime issues. Verify readiness, simulation, vehicle streaming
  and routing for any update.

## Remediate the remaining VitaTrack API image findings

- [ ] Review the 49 high findings from the patched image scan, starting with
  the four fixable findings in GraphQL Tools and Prisma tooling. Review the
  unsupported Apollo Server 3 stack and the Prisma CLI separately. Verify
  GraphQL, authentication, and nutrition and activity queries for any update.

## Isolate the portfolio apps on separate Swarm networks

- [ ] Inventory the legacy apps' shared overlay connections. Plan isolated
  ingress and database access per app, then verify proxy routing, database
  access and service health before removing the shared attachment.

## Verify the production password-reset redirect

- [ ] Complete a reset on the deployed site with a dedicated account and
  controlled inbox. Verify that a successful reset returns the signed-out user
  to the homepage, shows a confirmation, and clears the reset token from the
  URL and browser history. Obtain the owner's authorization before sending a
  test email. Record the result without storing credentials or tokens.

  The redirect passed local browser tests and shipped in
  [PR #15](https://github.com/PerrySmithMoss/BulkBets/pull/15). The remaining
  check is the redirect after submitting the form in production.

## Redesign BulkBets transactional emails

- [ ] Create a reusable branded email template and use it for password recovery,
  the first BulkBets email to adopt the design.

  The current password-reset email shows a bare URL in a plain-text message.
  Give it the same visual identity as the BulkBets app and make the next action
  easy to spot on a phone or desktop.

  - Use the BulkBets wordmark and brand colours in a responsive, single-column
    layout with clear typography, generous spacing and a prominent “Reset
    password” button. Include a concise subject and inbox preview text, plus a
    branded footer with guidance for people who did not request the reset.
  - Send HTML and plain-text versions in the same message through the existing
    Resend SMTP integration. Include a copyable reset link and explain that it
    expires in 30 minutes and can be used once. Use the public HTTPS reset link.
  - Use accessible contrast and meaningful text so the email works in dark mode
    and with images blocked. Share the header, footer and layout so future
    transactional emails can reuse them.
  - Verify rendering in Gmail, Apple Mail and Outlook on desktop and mobile,
    including dark mode and images blocked. Test that the HTML button and
    plain-text link reach the same reset flow and that expiry and single-use
    behaviour still work. Use an isolated fixture for automated tests.

  Done when the redesigned reset email is recognisably BulkBets, the reset action
  is easy to find and use across the tested clients, and the shared template is
  ready for future app emails.
