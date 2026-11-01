import Link from "next/link";
import { Logo } from "./logo";
export function SiteFooter() {
  return (
    <footer className="border-t bg-card/40">
      <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-7 sm:flex-row">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground">
              For the sport. For the stage.
            </p>
          </div>
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-7 gap-y-4 text-sm"
          >
            <Link href="/#markets" className="hover:text-primary">
              Shows & markets
            </Link>
            <Link href="/how-it-works" className="hover:text-primary">
              How it works
            </Link>
            <Link href="/help" className="hover:text-primary">
              Help & safer gambling
            </Link>
          </nav>
        </div>
        <div className="mt-8 flex items-start gap-4 border-t pt-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
            18+
          </span>
          <div className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            <p>
              BulkBets is a product preview with sample events. Deposits and
              withdrawals are unavailable. Historical odds are for reference and
              cannot be selected.
            </p>
            <p className="mt-2">
              Gambling involves risk. Only use money you can afford to lose.{" "}
              <Link
                href="/help"
                className="underline underline-offset-4 hover:text-foreground"
              >
                Find support and safer gambling information.
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
