"use client";

import { useSyncExternalStore, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useDialog } from "@/store/dialog/dialog-context";
import { useUser } from "@/store/user/user-context";
import { Dialog } from "@/types/dialog";

const subscribeToHash = (callback: () => void) => {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
};
const readHash = () => window.location.hash;
const serverHash = () => null;

export function AccountRecoveryForm({ reset = false }: { reset?: boolean }) {
  const hash = useSyncExternalStore(subscribeToHash, readHash, serverHash);
  const token = new URLSearchParams(hash?.slice(1) || "").get("token") || "";
  const ready = hash !== null;
  const [pending, setPending] = useState(false);
  const disabled = pending || !ready;
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { openDialog } = useDialog();
  const { setUser } = useUser();
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(
        `/api/v1/auth/${reset ? "reset-password" : "forgot-password"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            reset ? { token, password: data.password } : data,
          ),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setError(
          result.error || "Unable to complete your request. Please try again.",
        );
        return;
      }
      if (reset) {
        setUser(null);
        router.replace("/");
        toast.success(result.data.message);
        return;
      }
      setMessage(result.data.message);
    } catch {
      setError("Unable to connect. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }
  if (message)
    return (
      <div role="status" className="grid gap-5">
        <p className="leading-7">{message}</p>
        <Button onClick={() => openDialog(Dialog.LogIn)}>Back to log in</Button>
      </div>
    );
  if (reset && ready && !token)
    return (
      <div role="alert">
        <p className="mb-4">This link is missing its reset code.</p>
        <Link href="/forgot-password" className="text-primary underline">
          Request a new reset link
        </Link>
      </div>
    );
  return (
    <form onSubmit={submit} className="grid gap-5">
      {reset ? (
        <div className="grid gap-2">
          <Label htmlFor="reset-password">New password</Label>
          <Input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            disabled={disabled}
            aria-describedby="reset-hint"
          />
          <p id="reset-hint" className="text-sm text-muted-foreground">
            Use at least 12 characters.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="recovery-email">Email address</Label>
          <Input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={disabled}
          />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <Button type="submit" disabled={disabled}>
        {pending
          ? "Please wait…"
          : reset
            ? "Save new password"
            : "Send reset link"}
      </Button>
      {reset && (
        <Link
          href="/forgot-password"
          className="text-sm text-primary hover:underline"
        >
          Request a new reset link
        </Link>
      )}
    </form>
  );
}
