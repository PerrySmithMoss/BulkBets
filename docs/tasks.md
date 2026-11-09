# Tasks

## Order for the remaining work

Track automatic verification of the revision served by the public Vercel domain
in [BulkBets issue #19](https://github.com/PerrySmithMoss/BulkBets/issues/19).

1. On 12 November 2026, check for a new official PostgreSQL 17 Bookworm image
   and [prepare the switch](#switch-to-the-official-postgresql-17-image) if it
   passes verification. Review the remaining Debian findings with the
   infrastructure maintainer on the same date.
2. Review the remaining high Debian findings in the VitaTrack API image
   for upstream fixes and reachable runtime issues.
3. Isolate each legacy app's Swarm network one at a time. Verify ingress,
   database access and rollback before removing its shared network attachment.
4. Confirm the homepage redirect after a successful production password reset
   before changing the email template.

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
  - [x] Resolve the mobile Glob and Minimatch advisories with scoped overrides
    to Glob 14.0.4 and Minimatch 11.0.5. Full mobile and web npm audits report
    zero vulnerabilities. Recheck the overrides when updating their parent
    packages. [Fix and verification](https://github.com/PerrySmithMoss/BulkBets/pull/31)
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

## Remediate the remaining VitaTrack API image findings

- [ ] Review the 46 high Debian entries in the current production image scan
  for upstream fixes and reachable runtime issues. The scan reports no fixed
  versions for those entries and zero high or critical Node package entries.
  The deployed release uses Apollo Server 5 and Prisma 7. Verify GraphQL,
  authentication, and nutrition and activity queries for any update.
  [Production scan](https://github.com/PerrySmithMoss/VitaTrack/actions/runs/42699835207)

## Isolate the portfolio apps on separate Swarm networks

- [ ] Plan isolated ingress and database access per app, then verify proxy
  routing, database access and service health before removing the shared
  attachment. The 9 November 2026 VPS inventory confirmed that Chinwag, Fleet
  and VitaTrack still share `portfolio_network`.

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

## Completed

- [x] Migrate the BulkBets release broker and SSH forced command to Go.
  The administrator installed both binaries and verified the restricted account
  and sudo path on 9 November 2026. The production deployment and frontend
  promotion passed, and both public endpoints returned HTTP 200.
  [BulkBets PR #29](https://github.com/PerrySmithMoss/BulkBets/pull/29) ·
  [Production run](https://github.com/PerrySmithMoss/BulkBets/actions/runs/42703544447) ·
  [Installation and rollback runbook](../deploy/restricted/README.md#installation-and-cutover)
- [x] Migrate the `perry-infra` broker to Go. The merged port preserves the
  snapshot fingerprint format and includes boundary tests. On 9 November 2026
  the protected deployment passed through the Go broker, which was confirmed
  installed on the VPS.
  [perry-infra PR #12](https://github.com/PerrySmithMoss/perry-infra/pull/12) ·
  [Production run](https://github.com/PerrySmithMoss/perry-infra/actions/runs/42700548806)
- [x] Remediate the high findings tracked for the Chinwag API image. The scan
  matches the image running on the VPS and reports zero high or critical
  entries.
  [Dependency and messaging verification](https://github.com/PerrySmithMoss/chinwag/pull/3) ·
  [Production scan](https://github.com/PerrySmithMoss/chinwag/actions/runs/42511980699)
- [x] Remediate the high findings tracked for the Fleet API image. The scan
  matches the image running on the VPS and reports zero high or critical
  entries.
  [Dependency and streaming verification](https://github.com/PerrySmithMoss/logistics-realtime-dashboard/pull/7) ·
  [Production scan](https://github.com/PerrySmithMoss/logistics-realtime-dashboard/actions/runs/42703262104)
