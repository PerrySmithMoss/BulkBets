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

interface Props {
  activeDialog: DialogType | null;
  open: boolean;
  onOpenChange: () => void;
}

export const LogInDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  activeDialog,
}) => (
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
      <div className="flex flex-col space-y-2 mt-1">
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
      </div>
      <DialogFooter className="m1-2">
        <Button className="w-full" type="submit">
          Log in
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
