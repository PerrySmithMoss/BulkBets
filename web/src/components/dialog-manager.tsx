"use client";

import { usePathname } from "next/navigation";
import { Dialog } from "@/types/dialog";
import { LogInDialog } from "./dialogs/log-in-dialog";
import { useDialog } from "@/store/dialog/dialog-context";
import { RegisterUserDialog } from "./dialogs/register-user-dialog";
import { PlaceBetDialog } from "./dialogs/place-bet-dialog";
import { NoFundsInAccountDialog } from "./dialogs/no-funds-in-account";

export const DialogManager: React.FC = () => {
  const pathname = usePathname();
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
      {pathname !== "/" && <PlaceBetDialog />}
      <NoFundsInAccountDialog
        activeDialog={activeDialog}
        onOpenChange={closeDialog}
        open={activeDialog === Dialog.NoFundsInAccount}
      />
    </>
  );
};
