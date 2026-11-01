# QA inventory

The tests use the real Next.js app, Go API, Postgres migrations and show seeds in an isolated Docker project (`bulkbets-e2e`). Demo activity uses virtual funds only. The development database is untouched.

| Claim / control     | Functional check                                                                                                                  | Visual state / evidence                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Sportsbook homepage | One selected show, show and athlete search, division navigation, clear search, missing line-ups, dynamically added shows          | Desktop markets and persistent slip; authentic Olympia poster remains readable |
| Guest exploration   | Keyboard odds selection, deselection, reload persistence, Try demo without registration                                           | Empty and populated slips                                                      |
| Demo session        | Unique visitor account, £1,000 balance, repeated start preserves session, reload retains state                                    | Demo badge, virtual balance, account navigation                                |
| Betting             | Singles and pure accumulators; stake validation; API price checks; balance debit; returns include stake                           | Filled stakes, totals, receipt, insufficient balance                           |
| Simulation          | Win/loss outcomes; exact payout; repeated/concurrent requests do not pay twice                                                    | Settlement receipt and bet history                                             |
| Reset / isolation   | Only current visitor's bets and transactions are cleared; balance restored; other visitor untouched                               | Reset receipt, empty history                                                   |
| History             | All/Unsettled/Settled tabs, components included with paged accumulators, no false Live/Cash Out actions                           | Singles, accumulator and settled outcomes                                      |
| Existing accounts   | Registration, duplicates, age check, login errors, refresh, logout, SMTP recovery and one-use reset                               | Login dialog, account menu                                                     |
| Failure handling    | Unauthenticated demo actions 401; ordinary accounts 403; stale odds/closed normal markets rejected; service outage retry          | Error and retry states                                                         |
| Responsive layout   | 320/390/768/1024/1440 widths, no horizontal overflow, mobile division selector, navigation, fixed slip tray and dismissible sheet | Desktop, phone, tablet and populated phone slip screenshots                    |
| Copy / imagery      | Real show/year match; replay and virtual-funds labels; how-to/help links and reset explanation                                    | Poster, demo controls and help screens                                         |

Run `npm --prefix web run test:e2e -- --project=web-desktop --project=web-phone`.
Normal-account placement tests move only the isolated Olympia fixture into the future; demo tests also place bets on the untouched historical Arnold fixture. The application itself does not rewrite event dates.

Exploratory scenarios: unavailable API followed by retry; zero, negative, fractional-cent and excessive stakes; concurrent settlement; multiple visitor sessions; no matching search results; historical events and missing divisions.

Native Expo app behaviour, external OAuth providers and production deployment are outside this change's verification. The existing Expo web project can still be run separately.
