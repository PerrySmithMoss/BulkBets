import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      aria-label="BulkBets home"
      className="flex shrink-0 items-center text-xl font-bold tracking-tight sm:text-2xl"
    >
      <span>
        Bulk<span className="text-primary">Bets</span>
      </span>
    </Link>
  );
}
