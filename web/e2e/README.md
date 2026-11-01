# QA inventory

The browser suite uses actual Go handlers, Postgres migrations, repository demo seeds,
and a simulated test-account balance. It never submits real-money transactions.

| Surface / claim | Functional checks | Visual evidence |
| --- | --- | --- |
| Desktop shows | Two API-backed shows, competitor names, division tabs, carousel forward/back state | `home-desktop.png` |
| Guest betting | Selecting odds opens login; password is masked | `guest-login.png` |
| Authentication | Unknown email and wrong password rejected; valid login; protected route redirect; refresh rotation; logout | Guest login + authenticated betting states |
| Bet slip | Empty stake disabled; positive stake enabled; API accepts bet; balance debited | `bet-slip.png` |
| Saved slip / funds | Reload preserves selections and stake; insufficient balance shows dialog; cancel leaves balance unchanged | `insufficient-funds.png` |
| History | Pending selection appears under Unsettled and survives reload | `stored-bet.png` |
| API failures | Guest bet rejected, empty authenticated bet rejected, missing show is 404 | Assertions |
| Phone web | Homepage, navigation sheet, odds-selection login; viewport overflow checks | `home-phone.png`, `menu-phone.png`, `login-phone.png` |
| Expo demo | Home events, selection alert, division scrolling, all bottom tabs, return Home | `expo-home.png` and tab screenshots |

Exploratory checks include unknown email, known email with wrong password, lost access
token with retained refresh cookie, missing show, and malformed bet payload.

Native device execution, real OAuth, and unfinished registration/deposit/account screens
are outside the verified journeys. Exporting iOS/Android bundles checks compilation,
not native linking, touch behavior, permissions, or device runtime.
