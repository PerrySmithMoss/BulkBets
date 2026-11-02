import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { RegisterUserForm } from "./components/register-user-form";

export const metadata: Metadata = {
  title: "Create account | BulkBets",
  description: "Create your BulkBets account.",
};

export default function Page() {
  return (
    <main
      id="main-content"
      className="mx-auto min-h-screen max-w-lg px-5 py-8 sm:py-12"
    >
      <div className="flex items-center justify-between">
        <Logo />
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to shows
        </Link>
      </div>
      <div className="mt-10">
        <h1 className="text-3xl font-bold tracking-tight">
          Create your account
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          One account for your selections and bet history. You must be 18 or
          over.
        </p>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        <Link href="/privacy" className="text-primary underline">
          How your account and demo data are stored
        </Link>
      </p>
      <RegisterUserForm className="mt-8" />
      <p className="mt-6 text-sm leading-6 text-muted-foreground">
        Accounts start with £1,000 in virtual funds. Demo deposits, withdrawals,
        betting and simulated results are included. No real money is used.{" "}
        <Link href="/help" className="text-primary hover:underline">
          About the preview
        </Link>
      </p>
    </main>
  );
}
