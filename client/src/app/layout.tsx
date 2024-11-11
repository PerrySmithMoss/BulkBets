import type { Metadata } from "next";
import "./globals.css";
import { Inter as FontSans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { DialogManager } from "@/components/dialog-manager";
import { DialogProvider } from "@/contexts/dialog-context";
import { fetchCurrentUser } from "@/lib/api/users/fetch-current-user";
import { UserProvider } from "@/contexts/user-context";

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
  const user = await fetchCurrentUser();
  console.log("User: ", user);
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <UserProvider user={user}>
            <DialogProvider>
              <DialogManager />
              {children}
            </DialogProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
