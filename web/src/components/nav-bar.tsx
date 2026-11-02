"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDialog } from "@/store/dialog/dialog-context";
import { Dialog } from "@/types/dialog";
import { useUser } from "@/store/user/user-context";
import { useBetActions } from "@/store/betting";
import { logoutUser } from "@/lib/api/auth/logout-user";
import { formatCurrency } from "@/lib/utils/currency";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DemoButton } from "./demo-button";
import { Logo } from "./logo";

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { openDialog } = useDialog();
  const { user, setUser } = useUser();
  const { clearAllBets } = useBetActions();
  const router = useRouter();
  const logIn = () => {
    setMenuOpen(false);
    openDialog(Dialog.LogIn);
  };
  async function logOut() {
    setLoggingOut(true);
    try {
      if (!(await logoutUser(user?.id))) {
        toast.error("Unable to log out. Please try again.");
        return;
      }
      setMenuOpen(false);
      clearAllBets();
      setUser(null);
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }
  const links = [
    { href: "/#markets", label: "Markets" },
    { href: "/how-it-works", label: "How it works" },
    ...(user
      ? [
          { href: "/customer/my-bets?tab=All", label: "My bets" },
          { href: "/customer/wallet", label: "Wallet" },
          { href: "/customer/sandbox", label: "Event studio" },
        ]
      : []),
  ];
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-16 focus:z-50 focus:rounded focus:bg-primary focus:p-3 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-1 px-3 sm:gap-2 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-1 sm:gap-2 md:gap-4">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 md:hidden"
                aria-label="Toggle navigation menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetTitle>Explore BulkBets</SheetTitle>
              <SheetDescription>
                Shows, market guides and your account.
              </SheetDescription>
              <nav
                aria-label="Mobile navigation"
                className="mt-8 flex flex-col gap-2"
              >
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-md px-3 py-3 hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/help"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-3 py-3 hover:bg-muted"
                >
                  Help & safer gambling
                </Link>
                {!user && (
                  <>
                    <Button asChild className="mt-6">
                      <Link
                        href="/customer/account/create"
                        onClick={() => setMenuOpen(false)}
                      >
                        Create account
                      </Link>
                    </Button>
                    <Button variant="outline" onClick={logIn}>
                      Log in
                    </Button>
                  </>
                )}
                {user && (
                  <Button
                    variant="outline"
                    disabled={loggingOut}
                    onClick={logOut}
                  >
                    Log out
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
          <Logo />
        </div>
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-4 text-xs font-medium md:flex"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm tabular-nums" aria-label="Account balance">
              {user.is_demo && (
                <span className="mr-2 text-[10px] text-primary">DEMO</span>
              )}
              {formatCurrency(user.balance)}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Account menu">
                  <UserRound className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/customer/my-bets">My bets</Link>
                </DropdownMenuItem>
                {user.is_guest && (
                  <>
                    <DropdownMenuItem onClick={logIn}>
                      Log in to an account
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/customer/account/create">
                        Create account
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/customer/wallet">Demo wallet</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/customer/sandbox">Event studio</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/help">Help & safer gambling</Link>
                </DropdownMenuItem>
                <DropdownMenuItem disabled={loggingOut} onClick={logOut}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Button variant="ghost" onClick={logIn} className="px-2 sm:px-4">
              Log in
            </Button>
            <DemoButton className="px-3 text-xs sm:px-4 sm:text-sm" />
          </div>
        )}
      </div>
    </header>
  );
}
