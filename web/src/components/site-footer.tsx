import Link from "next/link";
export function SiteFooter() {
  return (
    <footer className="border-t bg-card/30 pb-20 lg:pb-0">
      <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-4 px-5 py-6 sm:flex-row">
        <p className="max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">
            BulkBets · Portfolio demo.
          </span>{" "}
          Virtual funds only. Deposits and withdrawals are simulated. Sample
          markets replay historical shows; simulated results are not official
          results. Event artwork belongs to its respective organisers.
        </p>
        <nav
          aria-label="Footer navigation"
          className="flex shrink-0 gap-5 text-xs text-muted-foreground"
        >
          <Link href="/how-it-works" className="hover:text-primary">
            How it works
          </Link>
          <Link href="/privacy" className="hover:text-primary">
            Privacy
          </Link>
          <Link href="/help" className="hover:text-primary">
            Help · 18+
          </Link>
        </nav>
      </div>
    </footer>
  );
}
