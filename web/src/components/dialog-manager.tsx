"use client";

import { Dialog } from "@/types/dialog";
import { LogInDialog } from "./dialogs/log-in-dialog";
import { useDialog } from "@/store/dialog/dialog-context";
import { RegisterUserDialog } from "./dialogs/register-user-dialog";
import { NoFundsInAccountDialog } from "./dialogs/no-funds-in-account";

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
      <RegisterUserDialog
        activeDialog={activeDialog}
        onOpenChange={closeDialog}
        open={activeDialog === Dialog.RegisterUser}
      />
      <NoFundsInAccountDialog
        activeDialog={activeDialog}
        onOpenChange={closeDialog}
        open={activeDialog === Dialog.NoFundsInAccount}
      />
    </>
  );
};
