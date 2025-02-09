"use client";

import React from "react";
import Link from "next/link";
import { Bell, CircleUser, Eye, Menu, PlusCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import { useDialog } from "@/store/dialog/dialog-context";
import { Dialog } from "@/types/dialog";
import { Logo } from "./logo";
import { useUser } from "@/store/user/user-context";
import { logoutUser } from "@/lib/api/auth/logout-user";
import { formatCurrency } from "@/lib/utils/currency";
import { Avatar, AvatarFallback } from "./ui/avatar";
import Image from "next/image";

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

    if (pathName === href) {
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
                    <Link href="/" className={getNavigationClassName("/")}>
                      All Shows
                    </Link>
                    <Link
                      href="#"
                      className={getNavigationClassName("/in-play")}
                    >
                      In-Play
                    </Link>
                    <Link
                      href="#"
                      className={getNavigationClassName("/calendar")}
                    >
                      Calendar
                    </Link>
                    {user && (
                      <Link
                        href="/customer/my-bets"
                        className={getNavigationClassName("/customer/my-bets")}
                      >
                        My Bets
                      </Link>
                    )}
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
              <Link href="/" className={getNavigationClassName("/")}>
                All Shows
              </Link>
              <Link href="#" className={getNavigationClassName("/in-play")}>
                In-Play
              </Link>
              <Link href="#" className={getNavigationClassName("/calendar")}>
                Calendar
              </Link>
              {user && (
                <Link
                  href="/customer/my-bets"
                  className={getNavigationClassName("/customer/my-bets")}
                >
                  My Bets
                </Link>
              )}
            </nav>
            <div className="flex items-center gap-4 md:gap-2 lg:gap-4">
              {/* <form className="hidden [@media(min-width:1160px)]:block ml-auto flex-1 sm:flex-initial">
                <div className="relative">
                  <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search shows, divisions, competitors..."
                    className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[315px]"
                  />
                </div>
              </form> */}
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
                <div className="hidden xs:flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      className="h-0 w-0 p-[15px] bg-muted rounded-full"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Search className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-0 w-0 p-[15px] bg-muted rounded-full"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Button>
                  </div>
                  <div className="bg-muted rounded-full flex items-center">
                    <div className="text-[11px] pl-2.5 pr-2 flex items-center justify-center gap-1">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      {formatCurrency(user.balance)}
                    </div>
                    <Button className="text-[11px] h-0 w-0 px-10 py-3.5 rounded-full">
                      <div className="flex items-center gap-1 justify-center">
                        Deposit
                        <PlusCircle className="h-4 w-4" />
                      </div>
                    </Button>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Avatar asChild className="size-9 cursor-pointer">
                        {user.profile_image ? (
                          <Image
                            src={user.profile_image}
                            width={0}
                            height={0}
                            sizes="100vw"
                            style={{ width: "28px", height: "auto" }}
                            alt={`${user.first_name} ${user.last_name}`}
                          />
                        ) : (
                          <AvatarFallback>{`${user.first_name.charAt(
                            0
                          )}${user.last_name.charAt(0)}`}</AvatarFallback>
                        )}
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link href="/customer/my-account">
                        <DropdownMenuItem className="cursor-pointer">
                          My Account
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/customer/my-bets">
                        <DropdownMenuItem className="cursor-pointer">
                          My Bets
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/customer/bank">
                        <DropdownMenuItem className="cursor-pointer">
                          Bank
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/customer/help">
                        <DropdownMenuItem className="cursor-pointer">
                          Help
                        </DropdownMenuItem>
                      </Link>
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
                  <Button onClick={handleLogIn} variant="default">
                    Join
                  </Button>
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
