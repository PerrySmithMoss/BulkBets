import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  CircleHelp,
  Layers3,
  Trophy,
} from "lucide-react";
import { fetchShowDirectory } from "@/lib/api/shows/fetch-show-directory";
import { ShowDirectory } from "@/components/home/show-directory";
import { RetryButton } from "@/components/retry-button";

export default async function Home() {
  const { shows, error } = await fetchShowDirectory();
  // eslint-disable-next-line react-hooks/purity -- Snapshot request time on the server for consistent hydration.
  const asOf = Date.now();
  return (
    <main
      id="main-content"
      className="mx-auto max-w-[1320px] px-4 pb-20 sm:px-6 lg:px-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-4 text-xs text-muted-foreground">
        <p>
          <span className="mr-2 inline-flex items-center gap-1.5 font-semibold text-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            PRODUCT PREVIEW
          </span>
          Sample events. Deposits and withdrawals unavailable.
        </p>
        <span className="hidden shrink-0 sm:block">18+ · Know your limits</span>
      </div>
      <section
        aria-labelledby="home-title"
        className="home-hero relative isolate overflow-hidden rounded-2xl border border-white/10 bg-[#0a100e]"
      >
        <Image
          src="/images/bulkbets-stage-v1.webp"
          alt="An athlete preparing backstage under green stage lights; original concept artwork"
          fill
          priority
          sizes="(max-width: 1320px) 100vw, 1256px"
          className="home-hero-image object-cover"
        />
        <div className="home-hero-shade absolute inset-0" />
        <div className="relative z-10 px-6 py-9 sm:px-10 sm:py-10 lg:px-14 lg:py-10">
          <p className="mb-5 flex items-center gap-3 text-[10px] font-bold tracking-[.22em] text-primary sm:text-xs">
            <span className="h-px w-7 bg-primary" />
            BODYBUILDING. CENTRE STAGE.
          </p>
          <h1
            id="home-title"
            className="hero-heading max-w-[720px] text-[clamp(2.4rem,5.2vw,4.25rem)] font-black uppercase leading-[.98] tracking-[-.045em]"
          >
            Built for
            <br />
            the big <span className="text-primary">stage.</span>
          </h1>
          <p className="mt-6 max-w-[400px] text-sm leading-relaxed text-zinc-300 sm:text-base">
            Explore the shows, compare the line-ups and browse bodybuilding
            winner markets.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href="#markets"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs sm:text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              Explore shows
              <ArrowDown className="hidden size-4 sm:block" />
            </a>
            <Link
              href="/how-it-works"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/25 bg-black/20 px-3 text-xs sm:text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              How it works
              <ArrowUpRight className="hidden size-4 sm:block" />
            </Link>
          </div>
        </div>
        <p className="absolute bottom-5 right-6 hidden text-[10px] font-semibold tracking-[.22em] text-white/60 lg:block">
          THE WORK BEHIND THE SPOTLIGHT
        </p>
      </section>
      <div className="grid grid-cols-3 border-b py-5 sm:py-6">
        {[
          {
            icon: Trophy,
            title: "Every show, in focus",
            subtitle: "Dates, locations and line-ups",
          },
          {
            icon: Layers3,
            title: "Find your division",
            subtitle: "Open, Classic, Figure and more",
          },
          {
            icon: Check,
            title: "Clear market status",
            subtitle: "See what’s open before you choose",
          },
        ].map(({ icon: Icon, title, subtitle }, i) => (
          <div
            key={title}
            className={`flex items-center justify-center gap-3 px-2 ${i ? "border-l" : ""}`}
          >
            <Icon className="hidden size-5 shrink-0 text-primary sm:block" />
            <div>
              <p className="text-center text-[11px] font-semibold sm:text-left sm:text-sm">
                {title}
              </p>
              <p className="mt-1 hidden text-xs text-muted-foreground lg:block">
                {subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
      <section
        id="markets"
        aria-labelledby="markets-title"
        className="scroll-mt-24 pt-9 sm:pt-12"
      >
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-primary">
              The line-up
            </p>
            <h2
              id="markets-title"
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Shows & markets
            </h2>
          </div>
          <Link
            href="/how-it-works"
            className="mb-1 hidden items-center gap-2 text-sm text-muted-foreground hover:text-foreground sm:flex"
          >
            <CircleHelp className="size-4" />
            Understanding the odds
          </Link>
        </div>
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/5 p-5"
          >
            <h3 className="font-semibold">
              {shows.length
                ? "Some shows couldn’t be loaded"
                : "Shows are temporarily unavailable"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Please try again in a moment. Your selections are saved.
            </p>
            <RetryButton />
          </div>
        )}
        {(!error || shows.length > 0) && (
          <ShowDirectory shows={shows} asOf={asOf} />
        )}
      </section>
      <section
        aria-labelledby="guide-title"
        className="mt-10 grid gap-8 rounded-2xl border bg-card p-6 sm:mt-14 sm:p-8 lg:grid-cols-[1fr_2fr] lg:gap-12"
      >
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-primary">
            New to BulkBets?
          </p>
          <h2
            id="guide-title"
            className="text-2xl font-semibold tracking-tight"
          >
            Start with the sport.
          </h2>
          <Link
            href="/how-it-works"
            className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Read the guide
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <ol className="grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Explore a show",
              text: "Check its date, divisions and market status.",
            },
            {
              title: "Compare the line-up",
              text: "Review the athletes and the available winner prices.",
            },
            {
              title: "Review your selection",
              text: "Open markets let you select odds, then check your slip.",
            },
          ].map((item, i) => (
            <li key={item.title}>
              <span className="mb-3 block font-mono text-xs text-primary">
                0{i + 1}
              </span>
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.text}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
