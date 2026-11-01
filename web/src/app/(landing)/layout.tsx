import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { NavBar } from "@/components/nav-bar";

export const metadata: Metadata = {
  title: "BulkBets | Bodybuilding shows & winner markets",
  description:
    "Explore bodybuilding shows, compare division line-ups and understand winner markets. BulkBets product preview.",
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
