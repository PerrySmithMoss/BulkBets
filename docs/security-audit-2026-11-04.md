# BulkBets security audit

Audit date: 4 November 2026. Read-only production inspection, source review, dependency and secret scans, and isolated session-security reproductions.

**The most urgent work is to patch the shared PostgreSQL instance and reduce the paths from the public proxy or a repository compromise to control of the whole VPS.** The application has useful security controls, but refresh-token rotation is not atomic and password recovery does not immediately invalidate existing access tokens.

This assessment concerns a virtual-money demonstration. There is no real-money payment or redemption path in the reviewed application. Account data, credentials, availability, and other applications on the shared VPS still need protection. No exploitation of production, credential guessing, load testing, production writes, deployments, or infrastructure changes were performed. Only this report and its local reproduction fixture were added to the checkout.

## Scope and production snapshot

| Component | Evidence inspected |
| --- | --- |
| BulkBets repository | Clean checkout at `edce6e3d8c57b041f5e8fe54b5c1fc0bb76b7ad6`; web, mobile, API, SQL, migrations, deployment helpers, workflow, and available Git history |
| Shared infrastructure repository | Local `perry-infra` checkout and remote `main` at `7dd9bab9483dffbac65ab1e08e0a2f747d956827` |
| Frontend | `https://bulkbets.vercel.app`; authenticated Vercel project security, deployment protection, environment-variable metadata, firewall rules, and production commit |
| API | `https://bulkbets-api.perrysmithmoss.com`; live Swarm service, task configuration, health, anonymous authentication boundary, CORS preflight, and TLS |
| VPS | Debian 12; Docker 29.4.1; one Swarm manager/node; approximately 1.88 GB RAM and no swap; SSH, listening sockets, available update list, timers, containers, and networks |
| Shared dependencies | Traefik `v3.6.13`, PostgreSQL `17.4`, shared `portfolio_network`; database configuration and privileges queried in explicit read-only transactions |
| GitHub | Branch protection status, workflow permissions, variables, secret names only, environments, dependency-alert configuration, and release status |

Production changed during the audit through an independently running deployment. Initially the API ran `875901e4257073d5ca584da3ed927e1e988e27e6`; by approximately 12:25 UTC its service referenced `edce6e3d8c57b041f5e8fe54b5c1fc0bb76b7ad6@sha256:e09115c6c8435089413d186d90d1e33bcdebf63d9300ab989d96ccce9d652c9c`. Vercel had already promoted `edce6e3` while the GitHub pipeline was unfinished. Both directory endpoints returned HTTP 200 during that interval; no incompatibility was observed. The GitHub run subsequently completed successfully before this report was finalized. Findings about infrastructure describe the inspected live configuration, not merely repository defaults.

## Findings by priority

Severity reflects impact and prerequisites in this deployment. A High finding does not mean exploitation or a breach was observed.

| ID | Severity | Finding | Evidence level |
| --- | --- | --- | --- |
| F01 | High | Shared PostgreSQL is missing published security fixes | Live version and vendor advisories |
| F02 | High | Public Traefik has unrestricted Docker socket access | Live mount and provider configuration |
| F03 | High | Unprotected repositories can deliver code to a privileged deployment channel | GitHub configuration, workflow, and manager access |
| F04 | Medium | Concurrent refresh-token replay defeats single-use rotation | Source and isolated handler reproduction |
| F05 | Medium | Password reset and logout leave existing access tokens usable | Source and isolated authentication reproduction |
| F06 | Medium | Anonymous rate limits group users behind the proxy | Live configuration and middleware logic |
| F07 | Medium | API resource consumption and container logs are unbounded | Live container and service settings |
| F08 | Medium | Shared network and database permissions weaken application isolation | Live network and database metadata |
| F09 | Low | Frontend HTML lacks framing restrictions and a CSP | Live response headers and Next configuration |
| F10 | Medium | Dependency alerts and automated security gates are absent | GitHub settings and pipeline |
| F11 | Medium | Vercel production promotion does not wait for the release pipeline | Observed deployment ordering |

### F01 Patch the shared PostgreSQL server

`SELECT version()` returned PostgreSQL **17.4**, matching [the infrastructure image declaration](/Users/pez/src/github.com/PerrySmithMoss/perry-infra/docker-stack.yaml:42). The current PostgreSQL security table lists fixes through 17.11. In particular, CVE-2026-14680 permits an authenticated database user to execute code as the database operating-system user, and CVE-2026-14664 describes a regexp memory-corruption route to code execution. Both affect 17.4 and are fixed in 17.11. [PostgreSQL security table](https://www.postgresql.org/support/security/17/), [CVE-2026-14680](https://www.postgresql.org/support/security/CVE-2026-14680/), [CVE-2026-14664](https://www.postgresql.org/support/security/CVE-2026-14664/).

The database is not published as a host port, and external TCP 5432 timed out. This reduces direct exposure but does not protect the shared database if an application or its database credentials are compromised. BulkBets has a legitimate database login, and all application services share a network with PostgreSQL. No vulnerability exploit was attempted.

**Fix:** verify an off-host backup and restoration first, then update within PostgreSQL major version 17 to a current supported minor release containing these fixes. Update the infrastructure image and the CI integration-test database version together, and check all applications sharing the instance. Do not substitute a major-version image upgrade against the existing data directory.

**Verify:** query the running server version; check vendor affected-version ranges; rerun database integration tests; restore the backup into a separate instance.

### F02 Restrict Traefik access to the Docker API

The internet-facing Traefik task mounts `/var/run/docker.sock` directly and uses it as its Swarm provider endpoint. The mount has no read-only flag and no filtering proxy. This matches [the infrastructure stack](/Users/pez/src/github.com/PerrySmithMoss/perry-infra/docker-stack.yaml:39).

A compromise of Traefik could therefore extend to Docker manager control and the other applications, secrets, and volumes on this host. This is a consequence of the access granted, not evidence of a Traefik vulnerability. Traefik itself documents this risk and access-restriction options. [Traefik Docker API security guidance](https://doc.traefik.io/traefik/v3.6/reference/install-configuration/providers/swarm/#docker-api-access).

**Fix:** place a tightly filtered Docker API proxy or equivalent authorization layer between Traefik and the manager. Permit only the discovery operations required by the Swarm provider, reject writes and container execution, and keep the proxy on a dedicated private network. A `:ro` socket mount alone does not restrict Docker API methods. Consider separating public ingress from the manager host.

**Verify:** Traefik still discovers routes; requests to create services/containers, execute commands, or obtain disallowed data through its API connection are denied in a controlled test.

### F03 Protect the production deployment trust boundary

GitHub reports `protected: false` for BulkBets `master` and `perry-infra` `main`. Branch protection/ruleset APIs report that the current private-repository plan does not support those features. BulkBets has **zero GitHub environments**, allows all Actions, and does not require action SHA pinning. A validated push to master automatically receives the deployment secret and can update Swarm. The configured local deployment connection successfully returned `Manager=true` through Docker over SSH.

The deployment account thus provides manager-level access rather than an application-scoped deployment API. An attacker who can modify the release workflow can remove its validation steps or use its deployment credential. Ordinary tests do not form an independent security boundary when the same unprotected commit controls them. The shared infrastructure workflow additionally passes its SSH key to the mutable third-party `cssnr/stack-deploy-action@v1` action. See [BulkBets deployment job](/Users/pez/src/github.com/PerrySmithMoss/BulkBets/.github/workflows/pipeline.yaml:133) and [infrastructure workflow](/Users/pez/src/github.com/PerrySmithMoss/perry-infra/.github/workflows/deploy.yaml:1).

**Fix:** enable enforceable protected branches/rulesets on a suitable plan, require checks and independent review of deployment/workflow changes, and restrict bypass permissions. Keep production credentials behind a protected environment or independently controlled deployment service. Restrict allowed Actions and pin external Actions to reviewed commit SHAs. Reduce the deployment credential's authority with an application-specific deployment broker/authorization policy or separate BulkBets infrastructure.

**Verify:** an unreviewed branch or workflow change cannot obtain production credentials or deploy; deployment authority cannot manage unrelated stacks. Host-level SSH restrictions on the deploy key were not readable, so arbitrary shell access is not claimed.

### F04 Make refresh-token consumption atomic

[The refresh handler](/Users/pez/src/github.com/PerrySmithMoss/BulkBets/server/cmd/api/auth.go:286) reads a user's refresh version, compares it with the token, then calls [an unconditional assignment](/Users/pez/src/github.com/PerrySmithMoss/BulkBets/server/internal/store/users.go:385). Two requests can both read version N and both write N+1. Both responses issue valid replacement tokens. Login and logout also calculate a replacement version from a previously read user object, allowing stale writes to interfere with revocation.

An isolated test synchronized two handler requests after reading the same version. **Both returned 200 and valid version-8 refresh tokens from the same version-7 token.** The repository stub intentionally models the unconditional assignment in the production SQL. This establishes the handler race under that interleaving; it was not exercised against production or a live database.

**Fix:** consume refresh tokens with a single compare-and-swap statement such as `UPDATE users SET refresh_token_version = refresh_token_version + 1 WHERE id = $1 AND refresh_token_version = $2 AND status = 'active' RETURNING refresh_token_version`. Treat no matching row as rejected reuse. Make logout/login revocation increments atomic too. Prefer separately revocable session records if multiple devices should coexist, and define a deliberate reuse-detection policy.

**Verify:** concurrent use of one refresh token permits exactly one successful rotation; stale writes cannot reverse a password-reset/logout revocation. Repeat with real PostgreSQL concurrency tests.

### F05 Revoke access tokens when sessions are revoked

Access tokens carry no session version. [Authentication middleware](/Users/pez/src/github.com/PerrySmithMoss/BulkBets/server/cmd/api/middleware.go:29) checks only signature/claims, user existence, and active status. [Password reset](/Users/pez/src/github.com/PerrySmithMoss/BulkBets/server/internal/store/password_reset.go:35) advances only `refresh_token_version`; logout does the same and clears cookies in the caller's browser.

An attacker retaining a copied access token can continue to authenticate until it expires, normally up to **15 minutes**, despite a password reset or logout. The isolated reproduction confirmed authentication still succeeds when the repository's current refresh version has advanced. This test models the resulting revoked state rather than sending a real reset email.

**Fix:** add and validate a session identifier or revocation version in access tokens against the user/session state already loaded on every request. Password reset should invalidate all applicable sessions. Keep access-token lifetime short as additional protection.

**Verify:** copy a token in an isolated test, reset the password or revoke its session, then confirm both access and refresh operations fail immediately.

### F06 Avoid shared anonymous rate-limit buckets

Live configuration sets `TRUST_EDGE=false`. [The limiter](/Users/pez/src/github.com/PerrySmithMoss/BulkBets/server/cmd/api/security.go:28) therefore uses the socket peer address. Traffic reaches the API through Traefik, so anonymous users behind the same proxy peer share budgets. [Login, registration, and password recovery](/Users/pez/src/github.com/PerrySmithMoss/BulkBets/server/cmd/api/api.go:47) each have a separate capacity of 60 requests per ten minutes. One caller can consume the budget used by other visitors. This is also documented in the deployment guide; no production limit-exhaustion test was performed.

**Fix:** establish a verified proxy trust chain and apply per-client limits at ingress, plus per-account limits for authentication and a global resource budget. The direct API hostname must receive equivalent controls to the Vercel path. Do not simply trust arbitrary `X-Forwarded-For` or enable `TRUST_EDGE` while callers can supply its trusted header. Use shared state if scaling replicas.

**Verify:** two independent clients receive independent anonymous budgets; forged forwarding headers cannot select a new bucket; direct-origin requests receive equivalent protection.

### F07 Bound memory, CPU, processes, and log growth

The running API has no memory, CPU, or PID limit; its service resources are `{}`. Its log driver is `json-file` with an empty configuration, so no per-container rotation limit is set. Traefik also uses an unconfigured `json-file` log driver. The API root filesystem is writable, with no explicit capability drop or `no-new-privileges` setting. The API correctly runs as UID/GID 65532 and is not privileged.

On this small shared host, expensive password hashing, uncapped read traffic, or sustained request logging can affect every app. Login, registration, and reset each have an independent throttle of eight; Argon2's configured default allocates approximately 64 MiB per operation. That gives a substantial potential memory footprint relative to the host's RAM. No exhaustion test was run.

**Fix:** measure realistic budgets and set container limits/reservations, bounded hash concurrency across routes, and log rotation/retention. Drop unnecessary capabilities, set `no-new-privileges`, and use a read-only filesystem with explicitly writable temporary storage after compatibility testing. Add host disk/memory alerts. See [the API service](/Users/pez/src/github.com/PerrySmithMoss/BulkBets/docker-stack.yaml:38).

**Verify:** inspect deployed limits and log configuration; test saturation in staging and establish that PostgreSQL/other services retain resources.

### F08 Tighten shared network and database isolation

The shared overlay is attachable and has no encryption option. BulkBets, other application services, Traefik, and PostgreSQL participate in it. PostgreSQL has `ssl=off`; the application uses `sslmode=disable`, and live application connections are unencrypted. The database accepts SCRAM-authenticated network connections for all users/databases. BulkBets can `CONNECT` to all five non-template databases, although this does **not** establish permission to read their application tables.

The BulkBets login is correctly non-superuser with no elevated role attributes or role memberships. However, it owns its database and all 26 public tables, so the runtime credential has migration/destructive-DDL authority as well as ordinary application access. The separate provisioner has `CREATEDB`/`CREATEROLE`, and its secrets are not mounted in the persistent API service.

**Fix:** separate ingress from application/database networks and isolate applications where practical. Restrict database connections to the intended database/role pairs. Use a migration owner distinct from a narrowly granted runtime role. Enable PostgreSQL TLS with certificate verification where database traffic crosses a shared trust boundary; consider encrypted overlays for traffic between hosts. All traffic is currently on one VPS, so lack of overlay encryption is not presented as proven internet interception.

**Verify:** from each application identity, test that unrelated database connections and objects are denied; runtime credentials cannot alter/drop schema; intended DB sessions validate TLS. See [network and DB configuration](/Users/pez/src/github.com/PerrySmithMoss/BulkBets/docker-stack.yaml:18).

### F09 Apply browser protections to frontend HTML

The live homepage returned HSTS but no `Content-Security-Policy`, `X-Frame-Options`, or `X-Content-Type-Options`. The API has framing/nosniff headers, but those do not protect the page that contains the account interface. [Next configuration](/Users/pez/src/github.com/PerrySmithMoss/BulkBets/web/next.config.ts:14) only defines headers for `/api/*`.

The confirmed issue is missing browser hardening, including a framing restriction; no XSS vulnerability was demonstrated. Financial impact is limited by the application's virtual-money design.

**Fix:** add `frame-ancestors 'none'` or the required trusted ancestors, `X-Frame-Options: DENY` where compatible, and `nosniff` to HTML responses. Develop a CSP compatible with Next.js, initially in report-only mode, then enforce it. Set deliberate Referrer-Policy and Permissions-Policy values.

**Verify:** inspect production HTML headers and confirm a separate-origin page cannot frame account screens; exercise normal web flows under the enforced CSP.

### F10 Enable dependency alerts and release security checks

GitHub explicitly returned **“Vulnerability alerts are disabled”** and **“Dependabot alerts are disabled for this repository.”** The pipeline runs useful tests and static checks, but no dependency-vulnerability, secret-history, or container-image security scan.

Current audit results:

| Scan | Result |
| --- | --- |
| Web locked production dependencies | 0 advisories |
| Web full dependency tree | 34 affected package entries: 31 moderate, 3 low |
| Mobile locked production dependency tree | 8 moderate affected package entries |
| Mobile full dependency tree | 22 moderate affected package entries |
| Go reachable symbols/imported packages | 0 reported vulnerabilities |
| Go required modules | 1 advisory for unused `golang.org/x/crypto/openpgp` functionality; not an imported/reachable vulnerable package |
| BulkBets Git history | Gitleaks 8.30.1 found no leaks across 112 available commits |
| Infrastructure Git history | Gitleaks 8.30.1 found no leaks across 9 available commits |

The npm counts include transitive packages affected by the same advisory; they are not counts of distinct exploitable vulnerabilities. Mobile's `--omit=dev` results include Expo CLI/build tooling and do not establish that vulnerable glob processing ships in a native runtime. The main reported transitive advisories concern `glob`, `minimatch`, and development-only `deepmerge`. [Glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249), [deepmerge advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4), [Go advisory](https://pkg.go.dev/vuln/GO-2026-5932).

**Fix:** enable dependency alerts and automated update review. Add reproducible dependency, secret, and image scans to release checks with documented, expiring exceptions based on reachability. Patch tooling through compatible upstream updates; do not apply the scanner's suggested framework downgrades blindly. Scan the exact deployed image digest, including its OS packages.

### F11 Coordinate Vercel production promotion with API validation

The live Vercel project showed `edce6e3` as its production commit while GitHub's run for that same commit remained unfinished and the API initially still ran `875901e`. Vercel's Git integration therefore promotes independently of the backend's validate/E2E/build/deploy sequence. The observed release remained compatible: both `/api/v1/shows/directory` paths returned 200.

**Fix:** use staged Vercel deployments and promote after the required checks and backend health/version confirmation, or configure an equivalent enforced deployment gate. Preserve backward compatibility during the overlap. Production and Preview currently share one `API_URL` variable entry; give previews a separate staging backend when testing write paths.

**Verify:** a failed test or failed API rollout prevents frontend production promotion. See [the run inspected](https://github.com/PerrySmithMoss/BulkBets/actions/runs/41827387907) and [deployment guidance](/Users/pez/src/github.com/PerrySmithMoss/BulkBets/deploy/README.md:301).

## Conditional application issue

**High if Google OAuth is enabled: automatic linking can retain an attacker's password.** Registration does not require email verification before password login. [OAuth upsert](/Users/pez/src/github.com/PerrySmithMoss/BulkBets/server/internal/store/users.go:224) merges by email and preserves an existing password hash when Google supplies none. An attacker can pre-register a victim's email; if the victim subsequently signs in with verified Google credentials, the account receives the Google identity while retaining the password selected by the attacker. The attacker can later sign in with that password. This is a source-supported account-linking flaw, not a live exploit reproduction. Google credentials were absent from the inspected production service, so this is a release blocker before enabling OAuth rather than a confirmed active production login path.

Require proof of ownership before activating a password account and before linking identities. Do not silently retain credentials from an unverified account when claiming it through a verified provider. Require an explicit reauthentication/linking process, and revoke previous sessions. Test the pre-registration scenario before enabling Google.

## Recovery and access gaps

**High-priority recovery gap:** scheduled, off-host BulkBets backups and a successful restore could not be established. The repository supplies a careful manual backup helper, but the rollout does not run it. No application backup timer appeared in the host's system timer list; inspected cron directories contained only OS jobs; `crontab` was unavailable. PostgreSQL has `archive_mode=off`, so no native continuous WAL archive is configured. Provider snapshots, an external scheduler, inaccessible backup paths, or a remote backup service may exist and were not verified.

Before the database upgrade, obtain a dated off-host backup, verify encryption/retention/access, and demonstrate restoration to a separate instance. Define acceptable data loss and recovery time, schedule backups, and alert on missed backups. A health endpoint cannot establish recoverability. See [backup helper](/Users/pez/src/github.com/PerrySmithMoss/BulkBets/deploy/backup.sh:1).

Other material limits and follow-up checks:

- **Host/provider firewall:** `ufw`, `fail2ban`, and `unattended-upgrades` services are active. Root-only firewall rules, the SSH cloud-init fragment, and effective root-level SSH configuration were not readable without interactive sudo. Public TCP checks from this workstation reached only 22/80/443 among the sampled ports; 2375/2376/2377/5432/7946/8080/5355 timed out. Host listeners also include Swarm UDP 4789 and TCP/UDP 7946. UDP reachability and IPv6 filtering were not established. Verify them at both host and provider firewalls; Swarm ports should be limited to trusted nodes. [Docker Swarm networking guidance](https://docs.docker.com/engine/swarm/networking/).
- **Host patching:** cached APT metadata offers Docker 29.9.3 and containerd 2.4.2 versus installed 29.4.1 and 2.2.3, plus other updates. This is a patch-maintenance gap, not a verified CVE finding for those packages. Confirm third-party repositories are covered by the patch process; unattended-upgrades being active does not prove that.
- **Accounts and providers:** IONOS account MFA/recovery, provider snapshots/firewall, registrar/DNS control, GitHub/Vercel account MFA and token inventory, Resend key scope/delivery, and Google OAuth console settings were not comprehensively inspected. No account permissions were changed.
- **Native mobile:** source and dependency review only. No signed store build or physical-device test was available. The native API URL defaults to HTTP localhost and lacks a production HTTPS guard; fail release builds without an explicit valid HTTPS origin. Verify OS cookie persistence, logout/revocation, backup behavior, signing credentials, and release artifact contents on iOS/Android. No plaintext token storage in app-managed local storage was found in the reviewed code.
- **Containers and testing:** no complete OS-package CVE scan of deployed image digests, full penetration test, traffic capture, or production incident-log investigation was performed. No assertion of absence of compromise follows from this audit.

## Controls that are working

- Both public origins completed trusted TLS 1.3 handshakes. The frontend certificate expires 29 January 2027; the API certificate expires 2 February 2027. HTTP API requests redirect to HTTPS. Both origins return HSTS.
- Anonymous `/users/me` returned 401. An untrusted-origin CORS preflight received no allow-origin grant. Session cookies are configured Secure in production, HttpOnly, host-only, and SameSite=Lax. API responses disable caching.
- The API runs non-root and has no published host port or Docker socket mount. PostgreSQL has no published host port. Production signing/database credentials are mounted as Swarm secrets, not plaintext service environment values.
- Production configuration rejects short/default signing secrets and equal access/refresh keys. Passwords use Argon2id. Reset tokens are random, stored as digests, expire, and are consumed transactionally. Production SMTP requires STARTTLS.
- Reviewed private-event queries enforce ownership; wallet/bet operations use parameterized SQL and transactional locking. Public result publication requires an explicit permission. Existing automated tests cover substantial behavior, though the database/browser suites were not rerun in this audit.
- Vercel has Standard Protection authentication enabled, protected source maps, build/source/log protection, and Git Fork Protection. No automation bypass secret, deployment-protection exception, custom firewall rule, or system bypass rule was listed in the inspected settings. Managed DDoS mitigations remain separate from custom rules.
- GitHub's default workflow token permission is read-only and workflows cannot approve PRs. BulkBets stores a `VPS_KNOWN_HOSTS` secret, so the weaker keyscan fallback is not the configured production path. Fail closed if that secret is removed rather than retaining the fallback.
- The ignored local server `.env` has mode 0600; the web `.env` contains only the API origin setting. No `.env` file appeared in the inspected Git path history.

## Validation and reproducibility

Passed during this audit:

- `go test ./...` and `go vet ./...` for the API. The former used cached results; integration tests require an isolated DSN and were not established by this command.
- Web Jest tests: 3 suites, 16 tests.
- Deployment rollout tests: 15 passed, 0 failed.
- Gitleaks 8.30.1 against all locally available refs of both repositories, with complete output redaction enabled.
- `govulncheck` 1.9.0 and npm lockfile audits, summarized above.
- Two new isolated session reproductions, compiled with `go test -race ./cmd/api -run TestAudit -count=1 -v`. Both reproduced the insecure behavior; a passing reproduction test is evidence of the finding, not proof of security.

The reproduction source is preserved in [session-reproduction_test.go.txt](/Users/pez/src/github.com/PerrySmithMoss/BulkBets/docs/security-audit-2026-11-04/session-reproduction_test.go.txt). To rerun, extract `git archive edce6e3d8c57b041f5e8fe54b5c1fc0bb76b7ad6 server` into a fresh temporary directory, copy the fixture to its `server/cmd/api/audit_reproduction_test.go`, and run the command above from that copied server directory. It uses synthetic identities and repository stubs, requires no credentials or database, and must not be treated as a replacement for real database race tests.

## Remediation order

1. Establish and test an off-host backup; patch PostgreSQL; restrict Traefik's Docker API access.
2. Protect the repositories and production deployment credentials; review action pinning and cross-stack deployment authority.
3. Fix atomic refresh rotation and access-token revocation; block OAuth enablement until account linking is fixed.
4. Correct ingress rate limiting, resource/log limits, database/network isolation, and frontend headers.
5. Enable security alerts/scans, coordinate Vercel promotion, verify backup/monitoring schedules, and close the provider/native-device access gaps.

After remediation, retest each finding's explicit verification condition against the deployed configuration. No fixes were applied as part of this audit.
