import Link from "next/link";
export const metadata = { title: "How it works | BulkBets" };
export default function Page() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-sm font-semibold text-primary">THE BASICS</p>
      <h1 className="mt-3 text-4xl font-bold">Know your market.</h1>
      <p className="mt-5 text-lg leading-8 text-muted-foreground">
        Explore the show, choose a division and review the details before making
        a selection.
      </p>
      <div className="mt-10 grid gap-8">
        <section>
          <h2 className="text-xl font-semibold">1. Find a show and division</h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            Each division has its own winner market. Check the event date and
            market status. Historical prices are displayed for reference and
            cannot be selected.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">2. Understand the price</h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            Fractional odds of 7/4 mean a £4 stake has £7 potential profit, plus
            the £4 stake returned if the selection wins. Decimal odds of 2.75
            describe the same price. Potential returns include the stake and are
            not guaranteed.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">3. Review your selection</h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            Selecting a price adds it to your slip. You can remove it or change
            the stake before submitting. Markets close when their division
            starts. If a price changes, select the new price and review the slip
            again.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">About this preview</h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            BulkBets is a product preview using sample event data. It does not
            offer deposits or withdrawals. Sample line-ups, odds and results are
            not an official event record. Full settlement terms, identity
            verification and payment services must be in place before real-money
            betting is offered.
          </p>
        </section>
      </div>
      <Link
        href="/#markets"
        className="mt-10 inline-flex rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground"
      >
        Explore shows
      </Link>
    </main>
  );
}
