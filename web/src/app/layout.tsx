import type { Metadata } from "next";
import "./globals.css";
import { DialogManager } from "@/components/dialog-manager";
import { DialogProvider } from "@/store/dialog/dialog-context";
import { fetchCurrentUser } from "@/lib/api/users/fetch-current-user";
import { UserProvider } from "@/store/user/user-context";
import { BetProvider } from "@/store/betting";
import { ClientProviders } from "@/providers/client/providers";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "BulkBets",
  description:
    "Explore bodybuilding shows, compare division line-ups and understand winner markets. BulkBets product preview.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data: user } = await fetchCurrentUser();
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <ClientProviders>
          <BetProvider>
            <UserProvider initialUser={user}>
              <DialogProvider>
                <DialogManager />
                {children}
              </DialogProvider>
            </UserProvider>
          </BetProvider>
          <Toaster />
        </ClientProviders>
      </body>
    </html>
  );
}
