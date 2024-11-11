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
import { Label } from "@/components/ui/label";
import { Dialog as DialogType } from "@/types/dialog";
import { useDialog } from "@/contexts/dialog-context";
import { useRouter } from "next/navigation";
import { RegisterUserForm } from "@/app/(customer)/customer/account/create/components/register-user-form";

interface Props {
  activeDialog: DialogType | null;
  open: boolean;
  onOpenChange: () => void;
}

export const RegisterUserDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  activeDialog,
}) => {
  const { closeDialog } = useDialog();
  const router = useRouter();

  //   const handleNewUser = () => {
  //     router.push("/customer/account/create");

  //     closeDialog();
  //   };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join us</DialogTitle>
          <DialogDescription className="pt-2">
            {activeDialog === DialogType.LogIn
              ? "Please log in"
              : "Quick - log in to place your bet!"}
          </DialogDescription>
        </DialogHeader>
        <RegisterUserForm />
        <DialogFooter className="mt-2 justify-center">
          <Button
            variant="link"
            // onClick={handleNewUser}
            className="text-sm text-primary p-0"
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
