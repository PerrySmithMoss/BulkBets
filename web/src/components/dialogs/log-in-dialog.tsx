"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dialog as DialogType } from "@/types/dialog";
import { useUser } from "@/store/user/user-context";

interface Props {
  activeDialog: DialogType | null;
  open: boolean;
  onOpenChange: () => void;
}

export function LogInDialog({ activeDialog, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <LoginContent
          key={activeDialog}
          isSelection={activeDialog === DialogType.LogInToBet}
          onClose={onOpenChange}
        />
      )}
    </Dialog>
  );
}

function LoginContent({
  isSelection,
  onClose,
}: {
  isSelection: boolean;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const { refreshUser } = useUser();
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: String(form.get("email")).trim(),
          password: form.get("password"),
        }),
      });
      if (!response.ok) {
        setError(
          response.status === 401
            ? "Invalid email or password"
            : "Unable to log in. Please try again.",
        );
        return;
      }
      await refreshUser();
      onClose();
      router.refresh();
    } catch {
      setError("Unable to connect. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Welcome back</DialogTitle>
        <DialogDescription>
          {isSelection
            ? "Log in to continue. Your selection is saved."
            : "Log in to your BulkBets account."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="mt-2 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="login-email">Email address</Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={pending}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={pending}
          />
        </div>
        <Link
          href="/forgot-password"
          onClick={onClose}
          className="justify-self-end py-1 text-sm text-primary underline-offset-4 hover:underline"
        >
          Forgot password?
        </Link>
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        New to BulkBets?{" "}
        <Link
          href="/customer/account/create"
          onClick={onClose}
          className="text-primary underline-offset-4 hover:underline"
        >
          Create account
        </Link>
      </p>
    </DialogContent>
  );
}
