# Tasks

Track BulkBets application and frontend work here. Shared VPS services, deployment
brokers, network policy and monitoring belong to
[perry-infra's tasks](https://github.com/PerrySmithMoss/perry-infra/blob/main/docs/tasks.md).

## Order for the remaining work

1. Verify that CI confirms the revision served by the public Vercel domain.
   Automatic promotion worked on the observed releases, but automated detection
   of a stale frontend remains open.
   [BulkBets issue #19](https://github.com/PerrySmithMoss/BulkBets/issues/19)
2. Confirm the homepage redirect after a successful production password reset.
3. Redesign BulkBets transactional emails after the reset journey is verified.

## Related repository tasks

- The official PostgreSQL 17.12 rollout and residual database-package findings
  are tracked in
  [perry-infra](https://github.com/PerrySmithMoss/perry-infra/blob/main/docs/tasks.md#switch-to-the-official-postgresql-17-image).
- Portfolio network isolation completed on 13 November 2026, including the old
  overlay retirement and protected release/rollback checks. Its task is closed.
  [Infrastructure verification](https://github.com/PerrySmithMoss/perry-infra/blob/main/docs/network-isolation-production-20261112.md)
- VitaTrack API image findings are tracked in
  [VitaTrack's tasks](https://github.com/PerrySmithMoss/VitaTrack/blob/master/docs/tasks.md).

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

- [x] Resolve the BulkBets mobile Glob and Minimatch advisories. Scoped overrides
  to Glob 14.0.4 and Minimatch 11.0.5 passed web/mobile audits, lint, types,
  native prebuilds, exports and fingerprint checks. Recheck the overrides when
  their parent dependencies change.
  [PR #31](https://github.com/PerrySmithMoss/BulkBets/pull/31)
- [x] Patch the Go toolchain security-gate failure with Go 1.27.4. Race tests and
  govulncheck passed, followed by required CI and a protected production release.
  [PR #32](https://github.com/PerrySmithMoss/BulkBets/pull/32) ·
  [Release evidence](https://github.com/PerrySmithMoss/perry-infra/blob/main/docs/vps-branch-protection-20261113.md)
