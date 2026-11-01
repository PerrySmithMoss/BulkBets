import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { NavBar } from "@/components/nav-bar";

export const metadata: Metadata = {
  title: "BulkBets | Bodybuilding shows & winner markets",
  description:
    "Explore bodybuilding markets with £1,000 in virtual funds. Place demo bets, simulate results and replay classic shows. No sign-up needed.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <NavBar />
      {children}
      <SiteFooter />
    </>
  );
}
