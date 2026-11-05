# Tasks

## Order for the remaining work

The BulkBets frontend is live at `b148be7` after a Vercel redeploy. Track
automatic promotion and verification of the revision served by the public
domain in [BulkBets issue #19](https://github.com/PerrySmithMoss/BulkBets/issues/19).

1. Replace the database credentials exposed in older Chinwag and VitaTrack
   startup logs. Both apps used the same PostgreSQL superuser, so
   give each app its own database role and versioned Swarm secret. Verify
   migrations, health, authenticated flows and database access boundaries.
   Then rotate the shared administrator password, update its recovery secret
   and confirm that the exposed password is rejected.
   Both apps now use the scoped roles. Production sign-in and app reads
   passed, and PostgreSQL rejects the retired administrator password over
   the overlay. The protected VPS snapshot and
   [perry-infra main](https://github.com/PerrySmithMoss/perry-infra/pull/6)
   both reference the new recovery secret.
2. Rescan and patch the remaining API image findings per app. Prioritize
   reachable critical issues and fixes that are available. The three patched
   API images are deployed and had zero critical scanner entries. Track the
   remaining high findings in the app tasks. See the [deployed digests and
   verification](security-evidence-2026-11-05.md#patched-legacy-api-images).
3. Finish the infrastructure workflow cleanup in perry-infra PR #5. Keep the
   owner-controlled infrastructure release and recovery path. Review the
   PostgreSQL candidate separately from the workflow change.
4. Rehearse PostgreSQL restore and rollback on a one-off recovery copy.
   Verify extensions, locale and collation, access from each app, and the
   candidate's scan before scheduling a database change. Review the remaining
   Debian findings with an owner and review date.
5. Isolate each legacy app's Swarm network one at a time. Verify ingress,
   database access and rollback before removing its shared network attachment.
6. Recheck Expo and TypeScript ESLint for compatible fixes. Run mobile
   exports, lint, type checks and browser coverage before updating the lockfiles.
7. Finish the controlled production password-reset walkthrough. Verify the
   redirect and single-use link before changing the email template.
8. Migrate the existing BulkBets and perry-infra Python brokers to Go after
   the release and recovery paths are stable. Roll them out separately.

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

  Done when both deployment paths use tested Go executables, their security
  restrictions and production releases are verified, and no maintained Python
  code remains in this deployment-tooling scope.

## Resolve remaining vulnerabilities and shared deployment privileges

- [ ] Address the upstream vulnerability findings and retire the other apps'
  shared privileged deployment account identified in items 4–5 of the
  [security follow-up report](security-follow-up-2026-11-05.md#open-items-and-accepted-limits).

  Coordinate changes across BulkBets, `perry-infra` and the other applications
  on the VPS. Use the report as a dated baseline; refresh the evidence before
  choosing upgrades or deciding that a finding still has no upstream fix.

  Implementation: migrate the web's pure TypeScript unit tests off Jest to
  remove its affected dependency chains. Keep Expo and TypeScript linting
  intact while verifying their upstream fixes.

  Track the shared deployment work in the dedicated
  [release account task](#create-separate-release-accounts-for-chinwag-fleet-and-vitatrack).

  The refreshed host-wide scan also covers the three legacy application images.
  Their application dependency and base-image upgrades are separate follow-up
  work per repository: each needs its own compatibility and business-flow tests.
  Track those findings here until the follow-up work has an owner; they do not
  justify retaining the shared Docker credential.

  **Vulnerabilities**

  - [ ] Rescan the deployed image digests and current web/mobile dependency
    trees, including development tooling. Record advisory IDs, affected versions,
    fixed versions, dependency paths and available vendor guidance. Distinguish
    scanner entries from demonstrated reachability and exploitability.
  - [ ] Resolve the remaining glob/minimatch and other npm findings through
    compatible upstream updates or deliberately tested dependency migrations.
    Avoid forced downgrades or overrides that merely make the audit count lower.
    Validate web/mobile lint, types, unit tests, browser tests and native exports
    for the affected dependency changes.
  - [ ] Assess the PostgreSQL image's remaining Debian-package and gosu findings.
    Verify which components are present and reachable, and retain direct UID 999
    startup so gosu is not invoked. Evaluate patched official images or a
    maintainable image that excludes unnecessary affected components; do not
    hide findings with blanket scan exclusions.
  - [ ] If remediation requires a PostgreSQL or base-distribution migration,
    assess database compatibility, extensions, locale/collation changes and any
    reindex requirement. Rehearse recovery and migration using a one-off recovery
    copy, plan the maintenance window and rollback, and verify every application
    sharing the database. Respect the owner's decision against scheduled backups.
  - [ ] Keep existing vulnerability gates and full scan artifacts. For findings
    without a safe fix, document affected versions, reachability, mitigation,
    upstream tracking, an owner and a review date. Obtain explicit acceptance of
    any residual risk; leave unresolved findings visibly tracked until patched
    or accepted, rather than treating a passing gate as a clean full report.

  Done when the release account task is complete and every refreshed
  vulnerability finding is either remediated or explicitly accepted with
  evidence, mitigation and a review date. Keep unresolved findings visible in
  scan reports and tracking.

## Create separate release accounts for Chinwag, Fleet and VitaTrack

- [ ] Replace the shared privileged VPS `deploy` account with one restricted
  release account and SSH credential per application.

  The broker passed an isolated Swarm release and rollback, and each repository
  has a production environment restricted to its default branch, with a
  dedicated key. All three accounts are installed and passed live SSH
  restriction checks. All four apps released automatically. Chinwag, Fleet
  and VitaTrack also passed their live rollback drills. BulkBets uses its own
  restricted account, which also handles application migrations. The shared
  GitHub credential was removed, and the VPS rejected the old SSH key after
  the administrator retired the account. See the
  [broker PR](https://github.com/PerrySmithMoss/perry-infra/pull/5)
  and [security evidence](security-evidence-2026-11-05.md#shared-credential-cutover).

  - [x] Install and verify `chinwag-release` for `chinwag_chinwag-api`.
  - [x] Install and verify `fleet-release` for `fleet_fleet-api`.
  - [x] Install and verify `vita-track-release` for `vita-track_vita-track-api`.
  - [x] Require passing PR checks before merging into each app's default
    branch. Deploy routine releases automatically from that branch and keep
    rollback dispatch deliberate.
  - [x] Verify the first automatic releases and the live Chinwag, Fleet and
    VitaTrack rollback drills.
  - [ ] Migrate one app at a time. The administrator installs the broker and
    records the reviewed service policy. Each protected production workflow
    can update only its own service image by immutable digest. Verify rejection
    of shell access, SFTP, forwarding, Docker socket access, arbitrary commands
    and manifests, and cross-application targets. Verify a real release and
    rollback, the application's core workflows and shared service health.
  - [x] Remove the dormant shared-key CI fallback from BulkBets.
  - [ ] Merge the perry-infra cleanup for its dormant fallback through
    [PR #5](https://github.com/PerrySmithMoss/perry-infra/pull/5).
  - [x] Confirm all remaining consumers of the old key, including administrator
    automation, CI secret scopes and emergency procedures. After every
    consumer has migrated, remove shared-key copies, revoke its VPS
    authorization, and disable the obsolete account's Docker and sudo access.
    Preserve the owner-controlled administrator recovery path. Verify the old
    key is rejected and routine releases work through the dedicated accounts.
  - [x] Record production releases, image digests, rollback and access-denial
    results in the runbook and security report.

  Done when all three applications release and roll back through their own
  restricted production accounts and the shared credential can no longer deploy.

## Remediate the remaining Chinwag API image findings

- [ ] Triage the 2 critical and 54 high entries from the refreshed Bookworm
  image scan. Identify affected runtime paths, update supported dependencies,
  and verify image scanning, migrations, sign-in and messaging before release.
  Rotate the database credential that the old entrypoint wrote to startup logs.

## Remediate the remaining Fleet API image findings

- [ ] Triage the 9 critical and 83 high entries in the new release image.
  Prioritize fixes for runtime packages and test readiness, simulation,
  vehicle streaming and routing before release.
  The API dependency change also requires a clean CI type check. Align the
  shared package's type exports with its generated files and build the shared
  package before checking its consumers.

## Remediate the remaining VitaTrack API image findings

- [ ] Triage the 4 critical and 62 high entries from the refreshed Bookworm
  image scan. Prioritize runtime fixes and test GraphQL, authentication, and
  nutrition and activity queries before release. Rotate the database credential
  that the old entrypoint wrote to startup logs.

## Isolate the portfolio apps on separate Swarm networks

- [ ] Inventory the legacy apps' shared overlay connections. Plan isolated
  ingress and database access per app, then verify proxy routing, database
  access and service health before removing the shared attachment.

## Verify production password-recovery delivery

- [ ] Verify production email delivery and the complete password-reset flow.

  Production SMTP configuration is complete. The live API uses the rotated,
  domain-restricted Resend key in `bulkbets_smtp_password_v2`, and verified
  STARTTLS, authentication and sender checks passed on 5 November 2026. No
  recipient or message was sent during that initial verification. See the
  [security follow-up report](security-follow-up-2026-11-05.md#open-items-and-accepted-limits).

  On 5 November 2026, the owner authorized a request from
  `https://bulkbets.vercel.app` and reported an email with a localhost link.
  Investigating the link origin is in scope because a localhost link prevents
  recovery from the email. The running production API had
  `APP_ENV=production` and `APP_CLIENT_URL=https://bulkbets.vercel.app`.
  The requested address had no production account or reset record, and
  Resend showed no matching send. After the owner registered the test account
  and authorized a retry, Resend reported **Delivered**. The link in that
  provider record used `https://bulkbets.vercel.app/reset-password` and opened
  the deployed reset form. The API logged a successful reset at 14:03 GMT,
  and a read-only check confirmed the reset record had been consumed. The
  owner confirmed inbox receipt, successful sign-in with the new password,
  rejection of the old password, and rejection of link reuse.

  The production walkthrough showed that a successful reset leaves the user
  on the reset page. Include an automatic return to the signed-out homepage
  with a success confirmation. Replace the reset page's history entry so
  Back skips the consumed link. Keep the token in the URL fragment, which
  browsers omit from the page request. The destination is always the homepage.

  The release smoke test also found that the browser can submit the
  forgot-password form before its JavaScript is ready. The browser reloads the
  page with the email in the URL and sends no reset email. Keep recovery inputs
  and submit buttons disabled until the form is ready to handle submissions.

  - Obtain the owner's authorization for a test email and identify the controlled
    recipient inbox before sending.
  - Use a dedicated test account and controlled inbox to request a reset through
    the deployed website. Confirm Resend reports delivery, the email arrives,
    and the reset link uses the public HTTPS origin and opens the deployed application.
  - Verify the reset succeeds, the new password works, the old password fails,
    and the reset link cannot be reused.
  - Verify that success returns the user to the homepage with a confirmation
    and no reset token in the URL. Errors stay on the reset form.
  - Delay the browser scripts and verify the recovery form stays disabled.
    Once scripts load, verify it sends one POST and keeps the email out of
    the URL.
  - Document the verification result without recording API keys, passwords,
    or reset tokens.
  - Run `go test ./...` in `server` for the in-process SMTP checks and
    `npm --prefix web run test:e2e -- --project=web-desktop --grep 'password recovery'`
    for the reset journey. Keep browser fixtures isolated with outbound email
    disabled. Use the Codex in-app browser at `http://localhost:3000` to
    check the recovery screens.

  Local verification passed. The Go suite covered SMTP using a local fixture.
  The isolated browser test covered disabled mail, missing and expired links,
  a successful reset, the signed-out homepage and its success confirmation,
  and Back skipping the consumed URL. It also verified the old and new
  passwords and rejected link reuse. The Codex browser confirmed fragment-link
  and missing-code behavior at `http://localhost:3000`.

  The redirect shipped on 5 November 2026 in
  [PR #15](https://github.com/PerrySmithMoss/BulkBets/pull/15).
  The [production workflow](https://github.com/PerrySmithMoss/BulkBets/actions/runs/42044660854)
  passed, and the public reset page served the updated bundle. Resend marked
  one fresh reset email for the dedicated test account **Delivered**. The
  owner will submit the reset to verify the homepage redirect in production.

  The early-submit fix shipped on 5 November 2026 in
  [PR #16](https://github.com/PerrySmithMoss/BulkBets/pull/16).
  The [production workflow](https://github.com/PerrySmithMoss/BulkBets/actions/runs/42068410808)
  passed. Both public recovery pages served disabled inputs and submit
  buttons in their initial HTML. The isolated delayed-script test verified
  that the form then enabled and sent one POST without changing the URL.

  Done when production password recovery passes the delivery and reset checks
  above, with credentials stored securely outside version control.

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
    expires in 30 minutes and can be used once. Use the public HTTPS link
    tracked in the production password-recovery task above.
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
