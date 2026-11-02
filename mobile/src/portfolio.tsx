import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

type User = {
  id: string;
  first_name: string;
  is_demo: boolean;
  is_guest: boolean;
  balance: number;
};
type Athlete = {
  final_position?: number;
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  odds: { bet_type_id: number; bet_type: string; odds_value: number }[];
};
type Division = {
  id: number;
  name: string;
  status: string;
  start_time: string;
};
type Show = {
  id: number;
  name: string;
  sandbox: boolean;
  status: string;
  end_time: string;
};
type Details = {
  show: Show;
  divisions: Division[];
  competitors: Record<string, Athlete[]>;
};
type Pick = {
  showId: number;
  divisionId: number;
  competitorId: string;
  betTypeId: number;
  betType: string;
  odds: number;
  amount: string;
  name: string;
  division: string;
};
type Receipt = {
  id: string;
  amount: number;
  kind: string;
  balance_after: number;
  created_at: string;
};
type Bet = {
  id: string;
  amount: number;
  potential_payout: number;
  status: string;
  is_accumulator: boolean;
  athlete?: { first_name: string; last_name: string };
  show?: { name: string };
};
const baseURL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === "web"
    ? __DEV__
      ? `${globalThis.location.protocol}//${globalThis.location.hostname}:8080/api/v1`
      : `${globalThis.location.origin}/api/v1`
    : "http://localhost:8080/api/v1");
const money = (n: number) => `£${n.toFixed(2)}`;

// This is an idempotency identifier, never an authentication secret.
function requestID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });
}

export async function api<T>(
  path: string,
  body?: unknown,
  method = "POST",
  retry = true,
): Promise<T> {
  const response = await fetch(`${baseURL}/${path}`, {
    method: body === undefined ? "GET" : method,
    credentials: "include",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401 && retry && !path.startsWith("auth/")) {
    const refreshed = await fetch(`${baseURL}/auth/token/refresh`, {
      credentials: "include",
    });
    if (refreshed.ok) return api<T>(path, body, method, false);
  }
  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    result = null;
  }
  if (!response.ok)
    throw new Error(
      result?.error ??
        (response.status === 401
          ? "Log in or start a demo to continue."
          : "Unable to complete your request. Please try again."),
    );
  return result?.data as T;
}

type Portfolio = {
  user?: User;
  shows: Details[];
  picks: Pick[];
  selected?: number;
  error: string;
  loading: boolean;
  select: (id: number) => void;
  toggle: (p: Pick) => void;
  stake: (id: string, amount: string) => void;
  clear: () => void;
  refresh: () => Promise<void>;
  start: () => Promise<void>;
  logout: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  report: (s: string) => void;
};
const Context = createContext<Portfolio | null>(null);
async function fetchPortfolio() {
  const user = await api<User>("users/me").catch(() => undefined);
  const list = await api<Show[]>("shows");
  const shows = await Promise.all(
    list.map((s) => api<Details>(`shows/${s.id}`)),
  );
  return { user, shows };
}
export function usePortfolio() {
  const value = useContext(Context);
  if (!value) throw new Error("Portfolio provider missing");
  return value;
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>();
  const [shows, setShows] = useState<Details[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [selected, select] = useState<number>();
  const [error, report] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const data = await fetchPortfolio();
    setUser(data.user);
    setShows(data.shows);
  }, []);
  useEffect(() => {
    void fetchPortfolio()
      .then((data) => {
        setUser(data.user);
        setShows(data.shows);
      })
      .catch(() =>
        report("Unable to load markets. Check your connection and retry."),
      )
      .finally(() => setLoading(false));
  }, []);
  const start = async () => {
    await api("demo/start", {});
    report("");
    await refresh();
  };
  const login = async (email: string, password: string) => {
    await api("auth/login", { email, password });
    report("");
    await refresh();
  };
  const logout = async () => {
    await api("auth/logout", {}, "DELETE");
    setUser(undefined);
    setPicks([]);
    await refresh();
  };
  return (
    <Context.Provider
      value={{
        user,
        shows,
        picks,
        selected,
        error,
        loading,
        select,
        report,
        refresh,
        start,
        login,
        logout,
        clear: () => setPicks([]),
        toggle: (p) =>
          setPicks((old) =>
            old.some((v) => v.competitorId === p.competitorId)
              ? old.filter((v) => v.competitorId !== p.competitorId)
              : [...old, p],
          ),
        stake: (id, amount) =>
          setPicks((old) =>
            old.map((p) => (p.competitorId === id ? { ...p, amount } : p)),
          ),
      }}
    >
      {children}
    </Context.Provider>
  );
}

function Action({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondary,
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text style={secondary ? styles.buttonSecondary : styles.buttonText}>
        {title}
      </Text>
    </Pressable>
  );
}
function Input({
  label,
  value,
  change,
  password = false,
  numeric = false,
}: {
  label: string;
  value: string;
  change: (s: string) => void;
  password?: boolean;
  numeric?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={change}
        secureTextEntry={password}
        autoCapitalize="none"
        keyboardType={numeric ? "decimal-pad" : "default"}
        style={styles.input}
        placeholderTextColor="#9ca9a2"
      />
    </View>
  );
}
function Notice({ text, error = false }: { text: string; error?: boolean }) {
  return text ? (
    <Text
      accessibilityRole={error ? "alert" : "text"}
      accessibilityLiveRegion="polite"
      style={[styles.notice, error && { borderColor: "#b76b58" }]}
    >
      {text}
    </Text>
  ) : null;
}

export function SessionButton() {
  const p = usePortfolio();
  const [open, setOpen] = useState(false);
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [dob, setDOB] = useState("");
  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={{ padding: 10 }}
      >
        <Text style={styles.accent}>
          {p.user ? `${money(p.user.balance)} · Account` : "Log in"}
        </Text>
      </Pressable>
      <Modal
        visible={open}
        onRequestClose={() => setOpen(false)}
        animationType="slide"
      >
        <ScrollView
          contentContainerStyle={[styles.screen, { paddingTop: 60 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>
            {p.user
              ? "Your demo account"
              : register
                ? "Create account"
                : "Log in"}
          </Text>
          <Text style={styles.muted}>
            Virtual funds only. No real-money payments.
          </Text>
          <Notice text={error} error />
          {p.user ? (
            <>
              <Text style={styles.balance}>{money(p.user.balance)}</Text>
              <Action
                title="Log out"
                disabled={busy}
                onPress={() => {
                  setBusy(true);
                  void p
                    .logout()
                    .then(() => setOpen(false))
                    .catch((e) => setError(String(e.message)))
                    .finally(() => setBusy(false));
                }}
              />
            </>
          ) : (
            <>
              {register && (
                <>
                  <Input label="First name" value={first} change={setFirst} />
                  <Input label="Last name" value={last} change={setLast} />
                  <Input
                    label="Date of birth (YYYY-MM-DD)"
                    value={dob}
                    change={setDOB}
                  />
                </>
              )}
              <Input label="Email" value={email} change={setEmail} />
              <Input
                label="Password"
                value={password}
                change={setPassword}
                password
              />
              {register && (
                <Text style={styles.muted}>
                  You must be 18+. Use at least 12 characters for your password.
                  New accounts receive £1,000 in virtual funds.
                </Text>
              )}
              <Action
                title={
                  busy
                    ? "Please wait…"
                    : register
                      ? "Create account"
                      : "Log in to account"
                }
                disabled={busy}
                onPress={() => {
                  setBusy(true);
                  setError("");
                  void (async () => {
                    if (register)
                      await api("auth/register", {
                        first_name: first,
                        last_name: last,
                        email,
                        password,
                        date_of_birth: dob,
                      });
                    await p.login(email, password);
                    setOpen(false);
                  })()
                    .catch((e) => setError(e.message))
                    .finally(() => setBusy(false));
                }}
              />
              <Action
                title="Email password reset link"
                secondary
                disabled={busy || !email}
                onPress={() => {
                  setBusy(true);
                  void api("auth/forgot-password", { email })
                    .then(() =>
                      setError(
                        "If this email has an account, a reset link will arrive in your inbox. Open it to choose a new password.",
                      ),
                    )
                    .catch((e) => setError(e.message))
                    .finally(() => setBusy(false));
                }}
              />
              <Action
                title={
                  register ? "Already have an account?" : "Create an account"
                }
                secondary
                onPress={() => {
                  setRegister(!register);
                  setError("");
                }}
              />
            </>
          )}
          <Action
            title="Close account panel"
            secondary
            onPress={() => setOpen(false)}
          />
        </ScrollView>
      </Modal>
    </>
  );
}

function DemoIntro() {
  const p = usePortfolio();
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Notice text={p.error} error />
      {!p.user && (
        <View style={styles.card}>
          <Text style={styles.heading}>Your picks. Your private demo.</Text>
          <Text style={styles.muted}>
            Start with £1,000 in virtual funds. Bet, simulate results, and
            explore the wallet without registering.
          </Text>
          <Action
            title={busy ? "Starting…" : "Try demo"}
            disabled={busy}
            onPress={() => {
              setBusy(true);
              void p
                .start()
                .catch((e) => p.report(e.message))
                .finally(() => setBusy(false));
            }}
          />
        </View>
      )}
    </>
  );
}

export function MarketsScreen({ search = false }: { search?: boolean }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const p = usePortfolio();
  const [query, setQuery] = useState("");
  const [divisionID, setDivisionID] = useState<number>();
  const [accumulator, setAccumulator] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState("");
  const term = query.toLowerCase().trim();
  const shows = p.shows.filter((s) =>
    `${s.show.name} ${Object.values(s.competitors)
      .flat()
      .map((a) => `${a.first_name} ${a.last_name}`)
      .join(" ")}`
      .toLowerCase()
      .includes(term),
  );
  const current = shows.find((s) => s.show.id === p.selected) ?? shows[0];
  const division =
    current?.divisions.find((d) => d.id === divisionID) ??
    current?.divisions[0];
  const athletes = (
    division ? (current?.competitors[division.id] ?? []) : []
  ).filter(
    (a) =>
      !term ||
      current?.show.name.toLowerCase().includes(term) ||
      `${a.first_name} ${a.last_name}`.toLowerCase().includes(term),
  );
  const open =
    !!current &&
    !!division &&
    (current.show.sandbox
      ? ["upcoming", "ongoing"].includes(current.show.status) &&
        division.status === "scheduled" &&
        Date.parse(division.start_time) > now
      : !p.user ||
        p.user.is_demo ||
        (division.status === "scheduled" &&
          Date.parse(division.start_time) > now &&
          Date.parse(current.show.end_time) > now));
  const total =
    p.picks.reduce((sum, pick) => sum + (Number(pick.amount) || 0), 0) +
    (Number(accumulator) || 0);
  async function place() {
    setBusy(true);
    p.report("");
    setReceipt("");
    try {
      await api("bets", {
        activeBets: p.picks.map((pick) => ({
          ...pick,
          amount: Number(pick.amount) || null,
        })),
        stakeMultiplier: Number(accumulator) || null,
      });
      p.clear();
      setAccumulator("");
      setReceipt(
        `Demo bet placed · ${money(total)} staked. See My Bets for your receipt.`,
      );
      await p.refresh();
    } catch (e) {
      p.report(e instanceof Error ? e.message : "Bet unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      style={styles.surface}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>
        {search ? "Find a show or athlete" : "Bodybuilding markets"}
      </Text>
      <DemoIntro />
      {(search || p.shows.length > 0) && (
        <Input
          label="Search shows or athletes"
          value={query}
          change={setQuery}
        />
      )}
      {p.loading && <ActivityIndicator color="#64d498" />}
      <ScrollView horizontal contentContainerStyle={styles.row}>
        {shows.map((s) => (
          <Action
            key={s.show.id}
            title={s.show.name}
            secondary={current?.show.id !== s.show.id}
            onPress={() => {
              p.select(s.show.id);
              setDivisionID(undefined);
            }}
          />
        ))}
      </ScrollView>
      {!current && !p.loading && (
        <Text style={styles.muted}>
          No matching markets. Clear your search or retry.
        </Text>
      )}
      {current && (
        <View style={styles.card}>
          <Text style={styles.heading}>{current.show.name}</Text>
          <Text style={styles.muted}>
            {current.show.sandbox
              ? `Private event · ${current.show.status}`
              : "Historical replay · sample odds"}
          </Text>
          <ScrollView horizontal contentContainerStyle={styles.row}>
            {current.divisions.map((d) => (
              <Action
                key={d.id}
                title={d.name}
                secondary={division?.id !== d.id}
                onPress={() => setDivisionID(d.id)}
              />
            ))}
          </ScrollView>
          {!open && <Text style={styles.muted}>Betting closed</Text>}
          {athletes.map((a) => {
            const price = a.odds?.find((o) => o.bet_type === "win");
            const picked = p.picks.some((pick) => pick.competitorId === a.id);
            return (
              <View key={a.id} style={styles.athlete}>
                <Text style={styles.text}>
                  {a.first_name} {a.last_name}
                </Text>
                <Action
                  title={`${picked ? "Remove" : "Select"} ${a.first_name} ${a.last_name} · ${price?.odds_value ?? "—"}`}
                  disabled={
                    !open ||
                    !price ||
                    !["registered", "active", "fulfilled"].includes(a.status)
                  }
                  secondary={!picked}
                  onPress={() => {
                    if (price && division)
                      p.toggle({
                        showId: current.show.id,
                        divisionId: division.id,
                        competitorId: a.id,
                        betTypeId: price.bet_type_id,
                        betType: "win",
                        odds: price.odds_value,
                        amount: "",
                        name: `${a.first_name} ${a.last_name}`,
                        division: division.name,
                      });
                  }}
                />
              </View>
            );
          })}
          {!athletes.length && (
            <Text style={styles.muted}>
              No athletes in this division match your search.
            </Text>
          )}
        </View>
      )}
      <View style={styles.card}>
        <Text style={styles.heading}>
          Bet slip · {p.picks.length} selections
        </Text>
        {p.picks.map((pick) => (
          <View key={pick.competitorId}>
            <Text style={styles.text}>
              {pick.name} · {pick.division} · {pick.odds}
            </Text>
            <Input
              label={`Stake for ${pick.name}`}
              numeric
              value={pick.amount}
              change={(value) => {
                if (/^\d{0,6}(\.\d{0,2})?$/.test(value))
                  p.stake(pick.competitorId, value);
              }}
            />
          </View>
        ))}
        {p.picks.length > 1 && (
          <Input
            label="Accumulator stake"
            numeric
            value={accumulator}
            change={setAccumulator}
          />
        )}
        <Text style={styles.muted}>
          Total virtual stake: {money(total)}. Returns include your stake.
        </Text>
        <Action
          title={busy ? "Placing…" : "Place demo bet"}
          disabled={
            busy ||
            !p.user ||
            !p.picks.length ||
            total <= 0 ||
            total > p.user.balance
          }
          onPress={() => void place()}
        />
        {!!p.picks.length && (
          <Action title="Clear slip" secondary onPress={p.clear} />
        )}
        <Notice text={receipt} />
      </View>
      <Action
        title="Refresh markets"
        secondary
        onPress={() => void p.refresh().catch((e) => p.report(e.message))}
      />
    </ScrollView>
  );
}

export function BetsScreen() {
  const p = usePortfolio();
  const [bets, setBets] = useState<Bet[]>([]);
  const [filter, setFilter] = useState("");
  const userID = p.user?.id;
  const report = p.report;
  const load = useCallback(async () => {
    if (userID)
      setBets((await api<{ bets: Bet[] }>(`bets?${filter}`)).bets ?? []);
    else setBets([]);
  }, [userID, filter]);
  useFocusEffect(
    useCallback(() => {
      if (!userID) return;
      void api<{ bets: Bet[] }>(`bets?${filter}`)
        .then((result) => setBets(result.bets ?? []))
        .catch((e) => report(e.message));
    }, [userID, filter, report]),
  );
  return (
    <ScrollView style={styles.surface} contentContainerStyle={styles.screen}>
      <Text style={styles.title}>My bets</Text>
      <DemoIntro />
      <View style={styles.row}>
        {[
          ["All", ""],
          ["Pending", "status=pending"],
          ["Settled", "status=settled"],
        ].map(([label, value]) => (
          <Action
            key={label}
            title={label}
            secondary={filter !== value}
            onPress={() => setFilter(value)}
          />
        ))}
      </View>
      {(p.user ? bets : []).map((b) => (
        <View key={b.id} style={styles.card}>
          <Text style={styles.heading}>
            {b.is_accumulator
              ? "Accumulator"
              : `${b.athlete?.first_name ?? ""} ${b.athlete?.last_name ?? ""}`}
          </Text>
          <Text style={styles.muted}>
            {b.show?.name ?? "Multiple divisions"}
          </Text>
          <Text style={styles.accent}>{b.status.toUpperCase()}</Text>
          <Text style={styles.text}>
            Stake {money(b.amount)} · Potential return{" "}
            {money(b.potential_payout)}
          </Text>
        </View>
      ))}
      {!bets.length && (
        <Text style={styles.muted}>
          No bets to show. Choose an athlete on Home to get started.
        </Text>
      )}
      <Action
        title="Refresh bet history"
        secondary
        onPress={() => void load().catch((e) => p.report(e.message))}
      />
    </ScrollView>
  );
}

export function WalletScreen() {
  const p = usePortfolio();
  const [amount, setAmount] = useState("100");
  const [transactions, setTransactions] = useState<Receipt[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState<{ payload: string; key: string }>();
  const userID = p.user?.id;
  const report = p.report;
  const load = useCallback(async () => {
    if (userID) setTransactions(await api<Receipt[]>("wallet"));
    else setTransactions([]);
  }, [userID]);
  const refresh = p.refresh;
  useFocusEffect(
    useCallback(() => {
      if (!userID) return;
      let active = true;
      const update = () =>
        api<Receipt[]>("wallet")
          .then((items) => {
            if (active) setTransactions(items);
          })
          .catch((e) => {
            if (active) report(e.message);
          });
      void update();
      const timer = setInterval(() => {
        void Promise.all([refresh(), update()]).catch((e) => {
          if (active) report(e.message);
        });
      }, 3000);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, [userID, report, refresh]),
  );
  async function transfer(kind: string) {
    setBusy(true);
    p.report("");
    setMessage("");
    const payload = `${kind}:${amount}`;
    const key = attempt?.payload === payload ? attempt.key : requestID();
    setAttempt({ payload, key });
    try {
      const receipt = await api<Receipt>("wallet/transfer", {
        kind,
        amount: Number(amount),
        request_key: key,
      });
      setMessage(
        `${kind === "DEMO_DEPOSIT" ? "Demo deposit" : "Demo withdrawal"} complete · ${money(Math.abs(receipt.amount))}. Receipt ${receipt.id}. No real money moved.`,
      );
      setAttempt(undefined);
      await p.refresh();
      await load();
    } catch (e) {
      p.report(e instanceof Error ? e.message : "Transfer unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView style={styles.surface} contentContainerStyle={styles.screen}>
      <Text style={styles.title}>Demo wallet</Text>
      <Text style={styles.muted}>
        Virtual funds only. Deposits and withdrawals are simulations, never real
        payments.
      </Text>
      <DemoIntro />
      <Text accessibilityLabel="Wallet balance" style={styles.balance}>
        {money(p.user?.balance ?? 0)}
      </Text>
      <Input
        label="Transfer amount"
        value={amount}
        change={setAmount}
        numeric
      />
      <Action
        title="Deposit demo funds"
        disabled={busy || !p.user?.is_demo}
        onPress={() => void transfer("DEMO_DEPOSIT")}
      />
      <Action
        title="Withdraw demo funds"
        secondary
        disabled={busy || !p.user?.is_demo}
        onPress={() => void transfer("DEMO_WITHDRAWAL")}
      />
      <Notice text={message} />
      <Text style={styles.heading}>Transaction history</Text>
      {(p.user ? transactions : []).map((t) => (
        <View key={t.id} style={styles.card}>
          <Text style={styles.text}>
            {t.kind.replaceAll("_", " ")} · {money(t.amount)}
          </Text>
          <Text style={styles.muted}>
            Balance {money(t.balance_after)} ·{" "}
            {new Date(t.created_at).toLocaleString()}
          </Text>
          <Text style={styles.small}>{t.id}</Text>
        </View>
      ))}
      {!transactions.length && (
        <Text style={styles.muted}>
          Your transfers, stakes, winnings and refunds will appear here.
        </Text>
      )}
    </ScrollView>
  );
}

export function EventsScreen() {
  const p = usePortfolio();
  const [mode, setMode] = useState("favourite");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const running = p.shows.some(
    (s) => s.show.sandbox && s.show.status === "ongoing",
  );
  const refresh = p.refresh;
  const report = p.report;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      void refresh().catch((e) => report(e.message));
    }, 1500);
    return () => clearInterval(timer);
  }, [running, refresh, report]);
  async function act(work: () => Promise<void>) {
    setBusy(true);
    p.report("");
    try {
      await work();
      await p.refresh();
    } catch (e) {
      p.report(e instanceof Error ? e.message : "Simulation unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView style={styles.surface} contentContainerStyle={styles.screen}>
      <Text style={styles.title}>Results & events</Text>
      <DemoIntro />
      <Text style={styles.muted}>
        Replay historical results or create a private event. Place bets on Home
        before running your event. Its market closes immediately and winnings
        arrive automatically after five seconds.
      </Text>
      <View style={styles.row}>
        {[
          ["Favourites", "favourite"],
          ["Outsiders", "upset"],
          ["Refund", "void"],
        ].map(([label, value]) => (
          <Action
            key={value}
            title={label}
            secondary={mode !== value}
            onPress={() => setMode(value)}
          />
        ))}
      </View>
      <Action
        title="Simulate replay results"
        disabled={busy || !p.user?.is_demo}
        onPress={() =>
          void act(async () => {
            const r = await api<{ settled_bets: number; payout: number }>(
              `demo/settle?mode=${mode}`,
              {},
            );
            setMessage(
              `${r.settled_bets} bets settled · ${money(r.payout)} returned to your virtual balance.`,
            );
          })
        }
      />
      <Action
        title="Create private event"
        secondary
        disabled={busy || !p.user?.is_demo}
        onPress={() =>
          void act(async () => {
            const r = await api<{ id: number }>("sandbox/shows", {
              name: "Mobile Invitational",
              division: "Men’s Open",
              competitors: [
                {
                  first_name: "Alex",
                  last_name: "Stone",
                  nationality: "British",
                  odds: 2,
                },
                {
                  first_name: "Sam",
                  last_name: "Rivera",
                  nationality: "Spanish",
                  odds: 4,
                },
              ],
            });
            p.select(r.id);
            setMessage(
              "Private event created. Open Home to place bets, then return here to run it.",
            );
          })
        }
      />
      <Notice text={message} />
      {p.shows
        .filter((s) => s.show.sandbox)
        .map((s) => (
          <View key={s.show.id} style={styles.card}>
            <Text style={styles.heading}>{s.show.name}</Text>
            <Text style={styles.accent}>
              {s.show.status === "ongoing"
                ? "Market closed · judging in progress"
                : s.show.status === "completed"
                  ? "Results published · bets settled"
                  : s.show.status === "canceled"
                    ? "Cancelled · stakes refunded"
                    : "Betting open"}
            </Text>
            {s.show.status === "completed" && (
              <Text style={styles.muted}>
                Winners:{" "}
                {Object.values(s.competitors)
                  .flat()
                  .filter((a) => a.final_position === 1)
                  .map((a) => `${a.first_name} ${a.last_name}`)
                  .join(", ")}
              </Text>
            )}
            {s.show.status === "upcoming" && (
              <>
                <Action
                  title={`Preview ${s.show.name}`}
                  secondary
                  disabled={busy}
                  onPress={() =>
                    void act(async () => {
                      const r = await api<{
                        settled_bets: number;
                        payout: number;
                      }>(`sandbox/shows/${s.show.id}/preview`, { mode });
                      setMessage(
                        `Preview: ${r.settled_bets} bets · ${money(r.payout)} in virtual returns. No balances changed.`,
                      );
                    })
                  }
                />
                <Action
                  title={`Run ${s.show.name}`}
                  disabled={busy}
                  onPress={() =>
                    void act(async () => {
                      await api(`sandbox/shows/${s.show.id}/run`, { mode });
                      setMessage(
                        "Market closed. Results and virtual winnings arrive automatically in about five seconds.",
                      );
                    })
                  }
                />
              </>
            )}
          </View>
        ))}
      <Action
        title="Reset my demo"
        secondary
        disabled={busy || !p.user?.is_demo}
        onPress={() =>
          void act(async () => {
            await api("demo/reset", {});
            p.clear();
            setMessage("Demo reset. Your virtual balance is £1,000.");
          })
        }
      />
      <Text style={styles.small}>
        Reset clears your bets, private events and wallet receipts. All money is
        virtual.
      </Text>
    </ScrollView>
  );
}

export const styles = StyleSheet.create({
  surface: { flex: 1, backgroundColor: "#101a15" },
  screen: {
    flexGrow: 1,
    backgroundColor: "#101a15",
    padding: 18,
    paddingBottom: 48,
    gap: 14,
  },
  title: { color: "#f0f5f2", fontSize: 25, fontWeight: "700" },
  heading: { color: "#f0f5f2", fontSize: 17, fontWeight: "600" },
  text: { color: "#f0f5f2", fontSize: 14, lineHeight: 22 },
  muted: { color: "#acbcb2", fontSize: 13, lineHeight: 21 },
  small: { color: "#acbcb2", fontSize: 11, lineHeight: 18 },
  accent: { color: "#64d498", fontSize: 13, fontWeight: "600" },
  balance: { color: "#f0f5f2", fontSize: 36, fontWeight: "700" },
  card: {
    borderColor: "#304139",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    backgroundColor: "#18261e",
  },
  row: { flexDirection: "row", gap: 8, paddingVertical: 4, flexWrap: "wrap" },
  athlete: {
    gap: 8,
    borderTopWidth: 1,
    borderColor: "#304139",
    paddingTop: 12,
  },
  inputGroup: { gap: 6 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#455b4d",
    borderRadius: 7,
    paddingHorizontal: 12,
    color: "#f0f5f2",
    backgroundColor: "#101a15",
    fontSize: 16,
  },
  button: {
    minHeight: 46,
    padding: 12,
    borderRadius: 7,
    backgroundColor: "#64d498",
    justifyContent: "center",
    alignItems: "center",
  },
  secondary: {
    borderWidth: 1,
    borderColor: "#455b4d",
    backgroundColor: "#18261e",
  },
  buttonText: { color: "#101a15", fontWeight: "700", fontSize: 13 },
  buttonSecondary: { color: "#b1edc9", fontWeight: "600", fontSize: 13 },
  notice: {
    color: "#f0f5f2",
    borderWidth: 1,
    borderColor: "#64d498",
    borderRadius: 8,
    padding: 14,
    lineHeight: 22,
    fontSize: 13,
  },
});
