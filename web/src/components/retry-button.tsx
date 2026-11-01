"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
export function RetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      className="mt-4"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Retrying…" : "Try again"}
    </Button>
  );
}
