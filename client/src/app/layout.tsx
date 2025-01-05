import type { Metadata } from "next";
import "./globals.css";
import { Inter as FontSans } from "next/font/google";
import { DialogManager } from "@/components/dialog-manager";
import { DialogProvider } from "@/store/dialog/dialog-context";
import { fetchCurrentUser } from "@/lib/api/users/fetch-current-user";
import { UserProvider } from "@/store/user/user-context";
import { BetProvider } from "@/store/betting";
import { ClientProviders } from "@/providers/client/providers";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "BulkBets",
  description:
    "BulkBets - The only place online to bet on bodybuilding shows. Available on desktop, mobile and tablet.",
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
        </ClientProviders>
      </body>
    </html>
  );
}
