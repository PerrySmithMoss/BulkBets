"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FaXTwitter,
  FaGoogle,
  FaGithub,
  FaApple,
  FaTwitter,
} from "react-icons/fa6";
import { Label } from "@/components/ui/label";
import { Dialog as DialogType } from "@/types/dialog";
import { useDialog } from "@/contexts/dialog-context";
import { useRouter } from "next/navigation";
import { OAuthProviders } from "@/types/auth/oauth";
import { API_ROUTES } from "@/lib/api/constants";
import { useState } from "react";

interface Props {
  activeDialog: DialogType | null;
  open: boolean;
  onOpenChange: () => void;
}

export const LogInDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  activeDialog,
}) => {
  const { closeDialog } = useDialog();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleNewUser = () => {
    router.push("/customer/account/create");

    closeDialog();
  };

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log in</DialogTitle>
          <DialogDescription className="pt-2">
            {activeDialog === DialogType.LogIn
              ? "Please log in"
              : "Quick - log in to place your bet!"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-3 mt-1">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="Enter your email"
              className="rounded mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              placeholder="*******"
              className="rounded mt-1.5"
            />
          </div>
          <Button
            variant="link"
            onClick={handleNewUser}
            className="text-xs text-primary p-0 pt-1 flex justify-end mt-0 h-0"
          >
            Forgot password?
          </Button>
        </div>
        <Button className="w-full mt-3" type="submit">
          Log in
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">OR</span>
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
        <DialogFooter className="mt-1 flex items-center justify-center sm:justify-center text-sm">
          <span>Don&apos;t have an account?</span>
          <Button
            variant="link"
            onClick={handleNewUser}
            className="text-sm text-primary p-0"
          >
            Join us
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
