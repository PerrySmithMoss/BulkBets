"use client";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Dialog as DialogType } from "@/types/dialog";
import { useBetActions } from "@/store/betting";
import { useUser } from "@/store/user/user-context";
import { formatCurrency } from "@/lib/utils/currency";
interface Props {
  activeDialog: DialogType | null;
  open: boolean;
  onOpenChange: () => void;
}
export function NoFundsInAccountDialog({ open, onOpenChange }: Props) {
  const { alert } = useBetActions();
  const { user } = useUser();
  const close = () => {
    onOpenChange();
    alert(
      "Sorry, you do not have enough funds in your account to place this bet",
    );
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Not enough balance</DialogTitle>
          <DialogDescription>
            Your account balance is lower than this stake. Reduce your stake or
            remove a selection to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="text-sm text-muted-foreground">Available balance</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatCurrency(user?.balance ?? 0)}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Deposits are unavailable in this product preview.
        </p>
        <Button onClick={close}>Back to bet slip</Button>
      </DialogContent>
    </Dialog>
  );
}
