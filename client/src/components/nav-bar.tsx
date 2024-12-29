"use client";

import React from "react";
import Link from "next/link";
import { CircleUser, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import { useDialog } from "@/store/dialog/dialog-context";
import { Dialog } from "@/types/dialog";
import { Logo } from "./logo";
import { useUser } from "@/store/user/user-context";
import { logoutUser } from "@/lib/api/auth/logout-user";
import { formatCurrency } from "@/lib/utils/currency";

interface Props {}

export const NavBar: React.FC<Props> = ({}) => {
  const pathName = usePathname();
  const { openDialog } = useDialog();
  const { user, setUser } = useUser();

  const handleLogIn = () => {
    openDialog(Dialog.LogIn);
  };

  const handleLogout = async () => {
    await logoutUser(user?.id);
    setUser(null);
  };

  const getNavigationClassName = (href: string) => {
    let className = "transition-colors hover:text-foreground";

    if (pathName.includes(href)) {
      className += " " + "text-foreground";
    } else {
      className += " " + "text-muted-foreground";
    }

    return className;
  };

  return (
    <div className="border-b">
      <div className="max-w-[1450px] my-0 mx-auto flex items-stretch">
        <div className="flex flex-col w-full">
          <header className="sticky top-0 flex h-16 items-center justify-between gap-4 bg-background px-4 md:px-6">
            <div className="flex items-center gap-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 [@media(min-width:820px)]:hidden"
                  >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <nav className="grid gap-6 text-lg font-medium">
                    <Logo />
                    <Link href="#" className={getNavigationClassName("shows")}>
                      Shows
                    </Link>
                    <Link
                      href="#"
                      className={getNavigationClassName("divisions")}
                    >
                      Divisions
                    </Link>
                    <Link
                      href="#"
                      className={getNavigationClassName("competitors")}
                    >
                      Competitors
                    </Link>
                    <Link
                      href="#"
                      className={getNavigationClassName("calendar")}
                    >
                      Calendar
                    </Link>
                  </nav>
                </SheetContent>
              </Sheet>
              <Link
                href="/"
                className="flex items-center gap-2 font-bold text-2xl"
              >
                <p>
                  Bulk
                  <span className="text-primary">Bets</span>
                </p>
                <span className="sr-only">IronBets</span>
              </Link>
            </div>
            <nav className="hidden flex-col gap-6 font-medium [@media(min-width:820px)]:flex [@media(min-width:820px)]:flex-row [@media(min-width:820px)]:items-center [@media(min-width:820px)]:gap-5 [@media(min-width:820px)]:text-sm lg:gap-6">
              <Link href="#" className={getNavigationClassName("shows")}>
                Shows
              </Link>
              <Link href="#" className={getNavigationClassName("divisions")}>
                Divisions
              </Link>
              <Link href="#" className={getNavigationClassName("calendar")}>
                Calendar
              </Link>
              {user && (
                <Link
                  href="/my-bets"
                  className={getNavigationClassName("my-bets")}
                >
                  My Bets
                </Link>
              )}
            </nav>
            <div className="flex items-center gap-4 md:gap-2 lg:gap-4">
              <form className="hidden [@media(min-width:1160px)]:block ml-auto flex-1 sm:flex-initial">
                <div className="relative">
                  <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search shows, divisions, competitors..."
                    className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[315px]"
                  />
                </div>
              </form>
              <div className="xs:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="rounded-full"
                    >
                      <CircleUser className="h-5 w-5" />
                      <span className="sr-only">Toggle user menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                    <DropdownMenuItem>Support</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {user ? (
                <div className="hidden xs:flex items-center">
                  <div className="text-[11px] pr-2">
                    {formatCurrency(user.balance)}
                  </div>
                  <Button variant="link" className="text-[11px] w-0 pl-6 pr-10">
                    Deposit
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full w-full"
                      >
                        <CircleUser className="h-5 w-5" />
                        <span className="sr-only">Toggle user menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Settings</DropdownMenuItem>
                      <DropdownMenuItem>Support</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={handleLogout}
                      >
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="hidden xs:flex items-center gap-3">
                  <Button onClick={handleLogIn} variant="outline">
                    Log in
                  </Button>
                </div>
              )}
            </div>
          </header>
        </div>
      </div>
    </div>
  );
};
