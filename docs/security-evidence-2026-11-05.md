# Remaining security work: verification on 5 November 2026

Follow-up to [items 4 and 5 of the security report](security-follow-up-2026-11-05.md#open-items-and-accepted-limits). The scan baseline and subsequent production cutovers are recorded below. No residual risk has been accepted as part of this task.

## Dependency findings

| Scope | Full tree before → after | Production tree after |
| --- | --- | --- |
| BulkBets web | 23 moderate and 3 low → 8 moderate | 0 |
| BulkBets mobile | 12 moderate → 12 moderate | 5 moderate |

- [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) (CVE-2026-93753, low): `jest → jest-config → deepmerge@4.3.1`. Upstream lists no patched release. Replacing Jest with Vitest removes that chain, along with Jest's vulnerable glob and minimatch paths.
- [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) (CVE-2026-118773, moderate; fixed in glob 14.0.2): removed Jest's paths through reporters/runtime (`13.0.6`) and `babel-plugin-istanbul → test-exclude` (`10.5.0`). Expo 58.0.23 still resolves `@expo/cli@58.1.19 → glob@13.0.6` and `@expo/fingerprint@0.21.9 → glob@13.0.6`. The published Expo parents still request `^13`; see [Expo #52735](https://github.com/expo/expo/issues/52735).
- [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) (CVE-2026-118764, moderate; fixed in minimatch 11.0.1): the remaining web chain is `eslint-config-next → typescript-eslint → @typescript-eslint/typescript-estree@8.72.1 → minimatch@10.2.6`. Mobile has the same parser chain through `eslint-config-expo`, as well as `expo → @expo/fingerprint → minimatch@10.2.6` and the Expo glob chain. The published [TypeScript ESLint parser tree](https://www.npmjs.com/package/@typescript-eslint/typescript-estree/v/8.72.1) still uses minimatch 10.

These affect pattern preprocessing and cancellation of directory walks. The identified paths run in lint, CLI and project fingerprinting; no route from remote app input or use in native app runtime was demonstrated. The five Expo entries remain in the production dependency tree because Expo declares its tools as dependencies. Keep linting intact and update the supported parent packages once they adopt the fixes. Do not force npm's suggested downgrades or a cross-major override. Owner: BulkBets maintainer; review by 19 November 2026.

## Fresh deployed image scan

Trivy 0.76.1 scanned all seven exact deployed linux/amd64 digests using the refreshed vulnerability database. The private BulkBets image was scanned from an image archive from the VPS. The evidence ZIP retains the full JSON (all severities, package paths and versions, advisory IDs, status and known fixed versions), the digest inventory and before/after npm reports. Archive: `security-scans-2026-11-05.zip` (SHA-256 `b72770a4e2859e9ef51bbeed7939f0f54ec241bb9be9f1be359dd9745349fefa`). CI changes retain full reports and preserve the existing vulnerability gates.

| Service at baseline | Digest prefix | Critical / high entries |
| --- | --- | ---: |
| BulkBets API | `5bd0d2ceda4d` | 0 / 0 |
| Traefik | `68ae5fe5b64c` | 0 / 0 |
| HAProxy Docker proxy | `2caaf8b1a1ef` | 0 / 0 |
| PostgreSQL 17.11 Bookworm | `665dc7b37ac5` | 4 / 72 |
| Chinwag | `bbffc1963639` | 11 / 137 |
| Fleet | `c4a73d3c5824` | 9 / 83 |
| VitaTrack | `411ceb2aa9f7` | 13 / 145 |

Counts are scanner entries, including repeat findings across packages. They are not distinct CVEs or proof of remote exposure. The three legacy API images need urgent remediation in their own repositories. All three include vulnerable `proxy-addr@2.0.7` ([CVE-2026-90711](https://nvd.nist.gov/vuln/detail/CVE-2026-90711), fixed in 2.0.8; applicability depends on proxy trust and address handling) and older `tar` packages ([CVE-2026-59873](https://nvd.nist.gov/vuln/detail/CVE-2026-59873), fixed in 7.5.19; exposure depends on untrusted archive input). Chinwag and VitaTrack used Debian 11 at baseline. Their Bookworm releases are recorded below. VitaTrack also carries `class-validator@0.13.2` ([CVE-2019-18413](https://nvd.nist.gov/vuln/detail/CVE-2019-18413), fixed in 0.14.0) and `sha.js@2.4.11` ([CVE-2025-9288](https://nvd.nist.gov/vuln/detail/CVE-2025-9288), fixed in 2.4.12). Prioritize rebuilding on supported images and testing dependency upgrades and the reachable routes. Owner: repository maintainer for each app; start now and review by 12 November 2026.

### PostgreSQL assessment

- Live checks verified UID 999 and `postgres` as PID 1. Gosu 1.19 (built with Go 1.24.6) is present but not invoked by that startup path. The 26 high/critical Go entries are scanner matches; the [gosu maintainer recommends checking whether vulnerable functions are called](https://github.com/tianon/gosu/blob/master/SECURITY.md).
- The [perry-infra candidate](https://github.com/PerrySmithMoss/perry-infra/pull/5) uses the exact current official base and removes gosu from its runtime filesystem. On an isolated stock-initialized volume, the read-only candidate (UID 999, no capabilities) read and wrote data with matching PostgreSQL version, encoding, locale and collation metadata. The refreshed candidate scan found zero gosu entries and the same 3 critical/47 high Debian entries, with no fixed high/critical entries in the existing gate. Gosu remains on the live image. Review by 12 November 2026, owner: infrastructure maintainer; test the reviewed, pinned candidate on a one-off recovery copy and verify every consumer before any cutover.
- The same-day official Bookworm tag resolves to the deployed digest. The same PostgreSQL 17.11 Trixie variant (`748a18a54d38`) had 1 critical/63 high OS entries plus the same gosu findings. This is not an unambiguous improvement or a drop-in change. Catalog checks found UTF-8/libc `en_US.utf8` with stored and actual glibc collation version 2.36 in all live databases; installed extensions include `plpgsql`, `citext` and `uuid-ossp`. A distribution change needs a recovery-copy rehearsal, extension/locale checks and an assessment of rebuilding affected indexes before updating collation versions. No production-copy restore or migration was attempted. Scheduled backups remain out of scope by owner decision.
- The critical Debian entries are [CVE-2025-7458](https://security-tracker.debian.org/tracker/CVE-2025-7458) (SQLite; SQLite is not linked into the PostgreSQL executable), [CVE-2023-45853](https://security-tracker.debian.org/tracker/CVE-2023-45853) (MiniZip component of zlib; the standalone MiniZip packages are absent and the ordinary zlib library is linked), and [CVE-2026-6653](https://security-tracker.debian.org/tracker/CVE-2026-6653) (linked libxml2; a path from application input to the affected parser was not established). Debian reports no Bookworm fix for these in the scanned versions. The linked XML, LDAP and zlib libraries merit continued review; checking what a process links does not prove specific functions are reachable or unreachable. Retain private database access, UID 999, read-only root filesystem and dropped capabilities. Owner: infrastructure maintainer; review upstream fixes and residual reachability by 12 November 2026. Keep entries in full reports.

## Shared credential cutover

GitHub workflow and secret-name inspection confirmed Chinwag, Fleet and VitaTrack used the repository-level `DEPLOY_SSH_PRIVATE_KEY` with `user: deploy`. The owner workstation also has the `deploy-vps` alias, and the key authenticated before cutover. The VPS account was in the Docker group. BulkBets and perry-infra use separate existing release paths. Default-branch workflows and repository-level secret names were searched in 25 active repositories, as were secret names in their 23 environments. No additional active consumer was identified. The local search covered source checkouts, launch agents and SSH aliases; the owner later confirmed the old credential had no other consumers.

The [broker and runbook](https://github.com/PerrySmithMoss/perry-infra/pull/5) are in draft review. The workflows for [Chinwag](https://github.com/PerrySmithMoss/chinwag/pull/1), [Fleet](https://github.com/PerrySmithMoss/logistics-realtime-dashboard/pull/1), and [VitaTrack](https://github.com/PerrySmithMoss/VitaTrack/pull/1) are merged. Each environment allows only its repository's default branch. Each has its own Ed25519 credential and a pinned VPS host key. BulkBets removed its dormant shared-key fallback. The perry-infra cleanup is part of its draft PR. Go race tests exercise malformed and cross-app input, revision mismatch, lock contention, timeouts, service drift, and incorrect or rolled-back tasks. An isolated Debian fixture exercised real OpenSSH and sudo with a simulated Docker backend, including shell, Docker stdio, SFTP, forwarding and cross-app denial. A disposable Docker Swarm also converged on a different published Chinwag digest and back to the previous digest, using an inert test process rather than the app workload. The test exposed that Docker can return before Swarm publishes its final update status; the broker now checks both bounded convergence and a running task. The administrator installed all three release accounts. First production releases passed. The shared credential was retired after the rollback checks below. After cutover, legacy applications still share an overlay; track per-app network isolation in a separate high-priority infrastructure ticket.

### Database credential rotation

Chinwag and VitaTrack used the same PostgreSQL administrator login. Each app
now uses a dedicated non-superuser role and a versioned Swarm secret. The
roles own their own Prisma tables and can run migrations. The database
administrator retains database ownership. Neither app role can connect to
the other app database. Disposable PostgreSQL tests covered ownership and
migrations, and live sign-in and app data reads passed for both services.
Both roles inherit PostgreSQL's default `CONNECT` permission to `bulk_bets`
but have no read or write privileges on its application tables. Tighten
connection policy in the existing network isolation task.

PostgreSQL now uses a versioned administrator recovery secret. Network
probes verified the new password, verified rejection of the previous
passwords, and closed the administrator's preexisting remote connections.
All seven Swarm services recovered after the secret update. The VPS
administrator installed the checksum-verified release snapshot, and
[perry-infra PR #6](https://github.com/PerrySmithMoss/perry-infra/pull/6)
merged the matching configuration. The retired application and administrator
secrets were removed from Swarm.

### Patched legacy API images

Trivy 0.76.1 scanned the published Linux amd64 digests in the production
workflows. The workflows retained the full reports and passed the gate for
fixable critical findings. Counts are scanner entries.

| App | Previous critical / high | Patched critical / high | Fixable high on patched image |
| --- | ---: | ---: | ---: |
| [Chinwag](https://github.com/PerrySmithMoss/chinwag/pull/2) | 2 / 54 | 0 / 45 | 0 |
| [Fleet](https://github.com/PerrySmithMoss/logistics-realtime-dashboard/pull/2) | 9 / 83 | 0 / 45 | 0 |
| [VitaTrack](https://github.com/PerrySmithMoss/VitaTrack/pull/2) | 4 / 62 | 0 / 49 | 4 |

Chinwag and VitaTrack passed migrations and authenticated API flows against
disposable databases. Fleet passed readiness and its 398 server tests.
VitaTrack's fixable high entries are in GraphQL Tools and Prisma tooling.
Review the unsupported Apollo Server 3 stack and the Prisma CLI separately.
Keep reviewing Debian fixes for the remaining entries across all three apps.

| API | Scanned digest | Release verification |
| --- | --- | --- |
| Chinwag | `sha256:70cbad834e8e7fc6b3beb9558116b8103524196fbdf283aa0eddd48cdcb624a7` | [Deployed through the restricted workflow](https://github.com/PerrySmithMoss/chinwag/actions/runs/42096328912). The live digest matched the scan, and live sign-in and messaging reads passed. |
| Fleet | `sha256:3cb74c6a9cd29df56d231e78e6bed3bb0ea3e2fcac9be97c4c50963be58a600c` | [Deployed automatically](https://github.com/PerrySmithMoss/logistics-realtime-dashboard/actions/runs/42096338327). The live digest matched the scan and readiness returned `UP`. |
| VitaTrack | `sha256:337ef99b8d87b33a8064489df06f553b5a0903d0a7c21bb2e9f6aa85f4154938` | [Deployed through the restricted workflow](https://github.com/PerrySmithMoss/VitaTrack/actions/runs/42096318530). The live digest matched the scan, and live sign-in, nutrition and activity reads passed. |

Replacing an app's Swarm secret changes the service policy the image-only
broker pins. During a deliberate secret rotation, review the live service
diff, record the new policy as administrator, and retry the protected release.
The broker rejected both changed policies before updating either image. The
administrator recorded both reviewed policies, and the failed deploy jobs
succeeded when retried with the already-scanned digests.

The VPS administrator installed `chinwag-release` on 5 November 2026 after verifying the staged checksums. The account belongs only to its own group. Authenticated probes rejected shell and PTY access, SFTP, TCP and Unix socket forwarding, Docker stdio, arbitrary stack manifests, cross-app targets, extra arguments and an incorrect image revision. The broker accepted the currently running Chinwag image `sha256:bbffc1963639cc27a112c06d7e3114bc425f08bc120f90e9b8217b9eca170a54` at revision `d2f3de038e257d7b0ca8783920f1533463e24143` without restarting its task. All seven Swarm services reported 1/1 replicas and the Chinwag auth endpoint returned the expected 403 for an unauthenticated request. Vercel blocked the original Chinwag preview because Next.js 15.3.3 was vulnerable. The updated PR passed Vercel, frontend and API image builds, and server tests with Next.js 15.5.29 and a pinned Debian Bookworm API base. An isolated PostgreSQL smoke test verified migrations, registration, sign-in and startup without logging the database URL. The old API entrypoint logged the database URL, so treat credentials present in historical startup logs as exposed until rotated. The [protected master workflow](https://github.com/PerrySmithMoss/chinwag/actions/runs/42069263840) tracks the first production release.

BulkBets verification: 17 web unit tests, 33 browser E2E cases, web and mobile lint/types, Android/iOS exports, Go tests/vet and symbol-level vulnerability checks, 17 rollout tests and three broker tests passed. In the Codex in-app browser at `http://localhost:3000`, the local Go/PostgreSQL-backed app loaded markets, created a guest session, posted a virtual deposit and receipt, and rejected a withdrawal above the available balance.

### Automatic app deployment

Chinwag, Fleet, VitaTrack and BulkBets now require PRs and green checks on their
default branches, including Vercel. Those branches are the only refs allowed
to use the VPS deployment environments. Each app has a different release key
and broker policy. BulkBets keeps its application migration and frontend
promotion steps. Shared infrastructure retains its separate release process.

Chinwag's first automatic deployment succeeded on retry after GitHub canceled
the queued job when the reviewer rule was removed. The live digest became
`sha256:0c14d2b95222aa89690c78bf741cc8276f2acac006b34896e57f7b13e5770f49`.
The API rejected a sign-in for a nonexistent user as expected.
Chinwag [rolled back](https://github.com/PerrySmithMoss/chinwag/actions/runs/42073592919)
to that digest from a distinct rebuild of the same patched commit. Both
builds keep the database URL out of startup logs.

The VPS administrator installed Fleet and VitaTrack's accounts. Both accepted
their own current image and denied shell, Docker stdio, SFTP, TCP and Unix
socket forwarding, arbitrary manifests, and cross-app requests. The following
automatic production releases passed their health checks.

| App | Production run | Image digest |
| --- | --- | --- |
| Chinwag | [Release](https://github.com/PerrySmithMoss/chinwag/actions/runs/42069263840) | `sha256:0c14d2b95222aa89690c78bf741cc8276f2acac006b34896e57f7b13e5770f49` |
| Fleet | [Release](https://github.com/PerrySmithMoss/logistics-realtime-dashboard/actions/runs/42073423708) | `sha256:a4cec2fa9bdbef7194bd97e760697855e365f0f552b0ba87dfcbfff0bc4afc8b` |
| VitaTrack | [Release](https://github.com/PerrySmithMoss/VitaTrack/actions/runs/42074189846) | `sha256:bc04be62819871c66f712b65d1aac012e4c1f3385703bb41c51a22ee43124acc` |
| BulkBets | [API release and frontend promotion](https://github.com/PerrySmithMoss/BulkBets/actions/runs/42073446304) | `sha256:c4896d3b60d98168389b43877ddaaed0d01343476d17eda6c82343b6cdd4b4c8` |

Fleet [rolled back](https://github.com/PerrySmithMoss/logistics-realtime-dashboard/actions/runs/42074239770)
to its previous digest and [restored the new release](https://github.com/PerrySmithMoss/logistics-realtime-dashboard/actions/runs/42074621771).
Both runs passed. VitaTrack's [patched rebuild](https://github.com/PerrySmithMoss/VitaTrack/actions/runs/42074899158)
released a distinct digest, then its [rollback](https://github.com/PerrySmithMoss/VitaTrack/actions/runs/42075530326)
restored the first patched digest. The public GraphQL probe passed on both.

The refreshed scans found 2 critical and 54 high entries for Chinwag, 9 critical
and 83 high for Fleet, and 4 critical and 62 high for VitaTrack. These are
scanner entries. The three app remediation tasks and the separate overlay
isolation task remain open. The PostgreSQL candidate has not been deployed to
the shared database. The deployed BulkBets source lockfiles still report 26 web
and 12 mobile findings. The web audit drops to 8 in
[BulkBets PR #18](https://github.com/PerrySmithMoss/BulkBets/pull/18).
Full reports are archived in `automatic-release-scans-2026-11-05.zip`.

The owner confirmed the retired account had no uses beyond the old app
workflows. After the rollback drills, GitHub removed the shared secret from
Chinwag, Fleet, and VitaTrack. The VPS administrator blocked the old login,
archived its authorized keys and removed its Docker group membership. The
legacy key returned `Permission denied (publickey)`, the separate owner login
still worked and all seven services reported 1/1 replicas. The three new SSH
accounts still accepted their current digests without changing the services.
BulkBets health, Fleet readiness and VitaTrack GraphQL passed. The live checks
covered release, rollback and health. Authenticated app flows were checked
with isolated fixtures or existing CI rather than production user accounts.
