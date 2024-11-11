import type { Metadata } from "next";
import "../../../../globals.css";

export const metadata: Metadata = {
  title: "BulkBets - Join us",
  description:
    "BulkBets - The only place online to bet on bodybuilding shows. Available on desktop, mobile and tablet.",
};

export default function RegisterUserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
