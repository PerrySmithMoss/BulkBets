"use client";

import { useUser } from "@/store/user/user-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function DemoButton({ className }: { className?: string }) {
  const { user, startDemo, startingDemo } = useUser();
  const router = useRouter();
  if (user?.is_demo) return null;
  return (
    <Button
      className={className}
      disabled={startingDemo}
      onClick={async () => {
        try {
          await startDemo();
          toast.success("Demo ready · £1,000 virtual balance.");
          router.refresh();
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to start demo. Please try again.",
          );
        }
      }}
    >
      {startingDemo ? "Starting…" : user ? "Switch to demo" : "Try demo"}
    </Button>
  );
}
