import type { Metadata } from "next";
import { NavBar } from "@/components/nav-bar";

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
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}
