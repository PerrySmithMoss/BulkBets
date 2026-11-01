import Link from "next/link";
export const metadata = { title: "Help & safer gambling | BulkBets" };
export default function Page() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-bold">Help & safer gambling</h1>
      <div className="mt-8 grid gap-8 text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            This is a product preview
          </h2>
          <p className="mt-3 leading-7">
            The events and prices are sample data. Deposits, withdrawals and
            real-money betting are not available. A displayed account balance is
            a development balance, not withdrawable funds.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Account access
          </h2>
          <p className="mt-3 leading-7">
            Create an account with your email and a password of at least 12
            characters. You must be 18 or over. If you cannot log in,{" "}
            <Link href="/forgot-password" className="text-primary underline">
              request a password reset
            </Link>
            . If recovery is unavailable, try again later; do not share your
            password with anyone.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Understanding markets
          </h2>
          <p className="mt-3 leading-7">
            Markets are specific to a show and division. Closed markets cannot
            be selected.{" "}
            <Link href="/how-it-works" className="text-primary underline">
              Read how odds and selections work
            </Link>
            .
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Keep gambling in perspective
          </h2>
          <p className="mt-3 leading-7">
            Gambling involves the risk of losing money. Never treat it as a
            source of income or chase losses. For independent information and
            support in Great Britain, visit{" "}
            <a
              href="https://www.nhs.uk/live-well/addiction-support/gambling-addiction/"
              className="text-primary underline"
            >
              NHS gambling support
            </a>{" "}
            or{" "}
            <a
              href="https://www.gamstop.co.uk/"
              className="text-primary underline"
            >
              GAMSTOP
            </a>
            .
          </p>
        </section>
      </div>
      <Link href="/" className="mt-10 inline-block text-primary">
        ← Back to shows
      </Link>
    </main>
  );
}
