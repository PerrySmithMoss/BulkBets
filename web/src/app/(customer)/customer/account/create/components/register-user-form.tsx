"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/store/user/user-context";
import { useDialog } from "@/store/dialog/dialog-context";
import { Dialog } from "@/types/dialog";

export function RegisterUserForm({ className }: { className?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const { refreshUser } = useUser();
  const { openDialog } = useDialog();
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const result = await response.json();
        setError(
          result.error || "Unable to create your account. Please try again.",
        );
        return;
      }
      setCreated(true);
      const login = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      if (login.ok) {
        await refreshUser();
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setPending(false);
    }
  }
  if (created)
    return (
      <div className={className} role="status">
        <h2 className="text-xl font-semibold">Your account is ready</h2>
        <p className="my-4 text-muted-foreground">
          You can now log in with your email and password.
        </p>
        <Button onClick={() => openDialog(Dialog.LogIn)}>Log in</Button>
      </div>
    );
  return (
    <form onSubmit={submit} className={className}>
      <fieldset disabled={pending} className="grid gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="first-name">First name</Label>
            <Input
              id="first-name"
              name="first_name"
              autoComplete="given-name"
              maxLength={100}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="last-name">Last name</Label>
            <Input
              id="last-name"
              name="last_name"
              autoComplete="family-name"
              maxLength={100}
              required
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="register-email">Email address</Label>
          <Input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="date-of-birth">Date of birth</Label>
          <Input
            id="date-of-birth"
            name="date_of_birth"
            type="date"
            autoComplete="bday"
            required
            aria-describedby="age-hint"
          />
          <p id="age-hint" className="text-xs text-muted-foreground">
            You must be 18 or over.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="register-password">Password</Label>
          <Input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="text-xs text-muted-foreground">
            Use at least 12 characters. A few unrelated words work well.
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <Button type="submit" className="h-11">
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </fieldset>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => openDialog(Dialog.LogIn)}
          className="py-2 text-primary hover:underline"
        >
          Log in
        </button>
      </p>
    </form>
  );
}
