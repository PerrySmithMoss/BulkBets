import Link from "next/link";

export const metadata = { title: "Privacy & demo data | BulkBets" };

export default function Page() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-bold">Privacy & demo data</h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        BulkBets is a software portfolio demo. All funds, deposits, withdrawals
        and results are simulated. You can explore it as a guest without
        providing your name, email address or date of birth.
      </p>
      <div className="mt-8 space-y-8 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Guest demos</h2>
          <p className="mt-2">
            A random visitor ID links your virtual balance, bets, receipts and
            private events. Guest records become eligible for automatic removal
            after 30 days without activity; cleanup runs in batches. Reset my
            demo clears that demo’s activity and restores its starting balance.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Registered accounts
          </h2>
          <p className="mt-2">
            Registration stores your name, email address, date of birth and a
            password hash. Google sign-in, when configured and chosen, supplies
            your verified email, name and profile image. Registered accounts and
            their activity are retained separately from guest cleanup. Resetting
            a demo does not delete its registered account. For access or
            deletion requests, contact the project owner using the contact
            details on the portfolio website that linked you here.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Cookies and browser storage
          </h2>
          <p className="mt-2">
            Session cookies keep you signed in. Browser storage preserves your
            web bet slip. Signing out clears the slip on that device; saved
            server-side activity remains until reset or cleanup. The application
            does not include an advertising or analytics integration.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Email and security
          </h2>
          <p className="mt-2">
            A configured email provider sends requested password-reset links.
            The host processes network addresses for rate limiting and keeps
            operational logs containing request paths, status codes and timing.
            Request query strings and authentication tokens are omitted from
            application request logs. Hosting and email providers may have their
            own operational retention settings.
          </p>
        </section>
      </div>
      <Link href="/" className="mt-8 inline-block text-primary">
        ← Back to markets
      </Link>
    </main>
  );
}
