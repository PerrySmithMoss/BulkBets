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

interface Props {
  activeDialog: DialogType | null;
  open: boolean;
  onOpenChange: () => void;
}

export const LogInDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  activeDialog,
}) => {
  const { closeDialog } = useDialog();
  const router = useRouter();

  const handleNewUser = () => {
    router.push("/customer/account/create");

    closeDialog();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log in</DialogTitle>
          <DialogDescription className="pt-2">
            {activeDialog === DialogType.LogIn
              ? "Please log in"
              : "Quick - log in to place your bet!"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-3 mt-1">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="Enter your email"
              className="rounded mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              placeholder="*******"
              className="rounded mt-1.5"
            />
          </div>
          <Button
            variant="link"
            onClick={handleNewUser}
            className="text-xs text-primary p-0 pt-1 flex justify-end mt-0 h-0"
          >
            Forgot password?
          </Button>
        </div>
        <Button className="w-full mt-3" type="submit">
          Log in
        </Button>
        <DialogFooter className="mt-1 flex items-center justify-center sm:justify-center text-sm">
          <span>Don&apos;t have an account?</span>
          <Button
            variant="link"
            onClick={handleNewUser}
            className="text-sm text-primary p-0"
          >
            Join us
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
