"use client";

import { cn } from "@/lib/utils/cn";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FaXTwitter,
  FaGoogle,
  FaGithub,
  FaApple,
  FaTwitter,
} from "react-icons/fa6";
import { OAuthProviders } from "@/types/oauth";
import { API_ROUTES } from "@/lib/api/constants";
import { useState } from "react";

interface Props extends React.HTMLAttributes<HTMLDivElement> {}

export function RegisterUserForm({ className, ...props }: Props) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const registerWithOAuth = async (provider: OAuthProviders) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/${API_ROUTES.AUTH.OAUTH2}/${provider}`
      );

      if (!res.ok) {
        console.error(`HTTP error! Status: ${res.status}`);
        return null;
      }

      const { oauthUrl } = await res.json();
      console.log("oauthUrl:", oauthUrl);
      if (!oauthUrl) return null;

      window.location.href = oauthUrl;
      return true;
    } catch (error) {
      console.error("Error fetching health check:", error);
      return null;
    }
  };

  const handleRegisterWithOauth = async (provider: OAuthProviders) => {
    const res = await registerWithOAuth(provider);
    console.log("res: ", res);

    if (res) {
      console.log(
        `Register with OAuth using ${provider} provider response:`,
        res
      );
    } else {
      console.error(`Failed to register with OAuth using ${provider} provider`);
    }
  };

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              className="rounded"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="email"
              placeholder="*******"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              className="rounded"
            />
          </div>
          <Button disabled={isLoading}>
            {isLoading &&
              //   <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              "Loading..."}
            Sign up
          </Button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      <div className="flex flex-col space-y-3">
        <Button
          variant="outline"
          type="button"
          onClick={() => handleRegisterWithOauth(OAuthProviders.Google)}
          disabled={isLoading}
        >
          <FaGoogle className="mr-2 h-4 w-4" />
          Google
        </Button>
        <Button variant="outline" type="button" disabled={isLoading}>
          <FaGithub className="mr-2 h-4 w-4" />
          GitHub
        </Button>
        {/* <Button variant="outline" type="button" disabled={isLoading}>
          <FaApple className="mr-2 h-4 w-4" />
          Apple
        </Button>
        <Button variant="outline" type="button" disabled={isLoading}>
          <FaTwitter className="mr-2 h-4 w-4" />
          Twitter
        </Button> */}
      </div>
    </div>
  );
}
