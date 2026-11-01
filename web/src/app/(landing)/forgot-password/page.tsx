import type { Metadata } from "next";
import { AccountRecoveryForm } from "@/components/account-recovery-form";
export const metadata: Metadata = {
  title: "Reset your password | BulkBets",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <main id="main-content" className="mx-auto max-w-md px-5 py-12 sm:py-20">
      <h1 className="text-3xl font-bold">Reset your password</h1>
      <p className="mb-8 mt-4 leading-7 text-muted-foreground">
        Enter your account email. We’ll send you a link that expires in 30
        minutes.
      </p>
      <AccountRecoveryForm reset={false} />
    </main>
  );
}
