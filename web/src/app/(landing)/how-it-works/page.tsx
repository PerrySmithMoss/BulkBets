import Link from "next/link";
export const metadata = { title: "How it works | BulkBets" };
export default function Page() {
  const sections = [
    [
      "1. Start your demo",
      "Choose Try demo for your own £1,000 virtual balance. No sign-up or payment details. Your balance and bets are saved to your session so you can reload and continue.",
    ],
    [
      "2. Pick a winner",
      "Choose a show and division, then select an athlete’s odds. The original show dates are kept for context. Demo markets stay playable, even after those dates have passed.",
    ],
    [
      "3. Set your stake",
      "Enter a stake for each single. You can also combine selections from different divisions in an accumulator: every selection must win for it to pay out. Review your total stake and potential return, then place your demo bet.",
    ],
    [
      "Understanding the price",
      "Fractional odds of 7/4 mean a £4 stake has £7 potential profit, plus the £4 stake returned if the selection wins. Decimal odds of 2.75 describe the same price. Potential returns include your stake.",
    ],
    [
      "4. Simulate the results",
      "Choose favourites, outsiders or cancellation in the replay controls, then use Simulate results to settle historical replay bets. In the event studio, running a private event closes betting and automatically publishes results and virtual returns after five seconds. Visit My bets and Wallet to see outcomes and receipts. These are simulated outcomes, not official show results.",
    ],
    [
      "Play again",
      "Place more bets whenever you like. Reset my demo clears only your bet history and restores your balance to £1,000. Other visitors’ sessions are unaffected. On mobile, open the bet-slip bar at the bottom of the screen to find these controls.",
    ],
    [
      "About BulkBets",
      "BulkBets is a full-stack portfolio project. Event artwork depicts real shows, while line-ups and prices are sample data. All funds are virtual. The demo wallet simulates deposits and withdrawals without moving real money. Account registration, login and password recovery are also available to explore.",
    ],
  ];
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-bold">How it works</h1>
      <div className="mt-8 grid gap-8">
        {sections.map(([title, text]) => (
          <section key={title}>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{text}</p>
          </section>
        ))}
      </div>
      <Link
        href="/"
        className="mt-10 inline-flex rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground"
      >
        Explore markets
      </Link>
    </main>
  );
}
