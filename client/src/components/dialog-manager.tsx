"use client";

import { Dialog } from "@/types/dialog";
import { LogInDialog } from "./dialogs/log-in-dialog";
import { useDialog } from "@/contexts/dialog-context";

export const DialogManager: React.FC = () => {
  const { activeDialog, closeDialog } = useDialog();
  return (
    <>
      <LogInDialog
        activeDialog={activeDialog}
        onOpenChange={closeDialog}
        open={
          activeDialog === Dialog.LogIn || activeDialog === Dialog.LogInToBet
        }
      />
    </>
  );
};
