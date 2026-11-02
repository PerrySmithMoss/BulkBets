# Portfolio QA inventory

Verify against the complete Go/Postgres application, with virtual funds only.

| Claim or control | Functional check | Visual state / evidence |
| --- | --- | --- |
| Guest and registered accounts | Registration, password login, recovery, refresh and logout E2E | Desktop and phone navigation; account balance and demo notices |
| Demo wallet | Deposit, withdraw, reload, overspend, duplicate request and altered-payload rejection | Balance, successful receipt, error and history; phone viewport fit |
| Bet slip | Singles, accumulators, mixed stakes, stale price, closed market, insufficient funds | Desktop slip, phone tray, Expo slip and bet history |
| Event creation and editing | Create show; rename; add divisions/athletes; change odds; select winner | Studio editor and private event market |
| Market suspension | Suspend and reopen, then run event and reject further bets | Open, suspended and judging states |
| Result preview | Calculate returns without changing balance/status | Winner names and projected virtual returns |
| Automatic settlement | Persist deadline, worker settlement and repeated execution | Judging → results published; wallet receipt |
| Refunds | Cancel singles and accumulators; reduce a void leg to odds 1 | Cancelled event, void bet return and refund receipt |
| Historical scenarios | Favourites, outsiders and cancellation | Replay selector, settled history and balance |
| Visitor isolation | Another account cannot read, edit or bet on a private event | Only the owner's event appears in its studio/directory |
| Reset and retention | Clear only the current account; expire idle guests; preserve registered users | Fresh balance, empty receipts/studio and retained login |
| Mobile API integration | Expo web betting, transfers, history and automatic event settlement | Phone screenshots, all five tabs; iOS/Android bundle exports |
| Hosting | Build images; validate proxy; DB-backed health; migration and backup/restore smoke check | Operational logs; no credentials in artifacts |

Exploratory cases: change accounts while viewing the wallet/studio; attempt a transfer
twice after a lost response; try settling a private event through historical replay;
repeat result publication after an accumulator has already been paid; change an
athlete's price after selecting it; restart the API during judging.

The isolated storage suite uses the race detector. Browser E2E does not establish
native-device behavior, public DNS/TLS issuance, external email delivery, or hosted
monitoring configuration. Those require the deployment's actual services/devices.

## Vercel / VPS verification (2026-11-02)

- Vercel-mode Next build passed with a configured HTTPS API origin.
- Docker validated the base Swarm stack and the combined SMTP/OAuth overlays.
- PostgreSQL 17.4 passed all migrations and seeds using a dedicated non-superuser
  database owner. A production-mode API container loaded file-mounted secrets,
  created a guest wallet, and issued host-only Secure/HttpOnly/SameSite=Lax cookies
  with uncached responses.
- The VPS backup helper produced a private dump. Restoring into an isolated
  replacement database preserved data and writable ownership for the app role.
- 31 browser tests, 6 storage integration tests with the race detector, 16 Jest
  tests, Go tests/vet and web/mobile lint/type checks passed. CI targets PostgreSQL
  17.4; local development can continue using PostgreSQL 18.6.

These checks used local isolated containers. No Vercel/VPS deployment, live Swarm
scheduling, public TLS/DNS, Google authorization, or Resend delivery was performed.


Outbound email is disabled in browser tests. Password-reset fixtures retain expiry,
one-use and session-revocation coverage; Go storage tests cover reset cooldown and
token replacement. In-process SMTP tests check message contents and production's
refusal to send over a server without STARTTLS. No mail service container or live
provider credentials are required by the automated suite.
