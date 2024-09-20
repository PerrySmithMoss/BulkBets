import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils/cn";
import { Inter as FontSans } from "next/font/google";
import { NavBar } from "@/components/nav-bar";
import { ThemeProvider } from "@/components/theme-provider";
import { DialogManager } from "@/components/dialog-manager";
import { DialogProvider } from "@/contexts/dialog-context";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "BulkBets",
  description:
    "BulkBets - The only place online to bet on bodybuilding shows. Available on desktop, mobile and tablet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DialogProvider>
            <NavBar />
            <DialogManager />
            {children}
          </DialogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
