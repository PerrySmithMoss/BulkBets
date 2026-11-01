import { Button } from "../ui/button";
import { Dialog as DialogType } from "@/types/dialog";
import { useBetActions } from "@/store/betting";
import { RxCross1 } from "react-icons/rx";
import { Overlay } from "../overlay";
import { useDialog } from "@/store/dialog/dialog-context";

interface Props {
  activeDialog: DialogType | null;
  open: boolean;
  onOpenChange: () => void;
}

export const NoFundsInAccountDialog: React.FC<Props> = ({
  activeDialog,
  open,
}) => {
  const { alert } = useBetActions();
  const { closeDialog } = useDialog();

  const handleClose = () => {
    closeDialog();
    alert(
      "Sorry, you do not have enough funds in your account to place this bet",
    );
  };

  if (!open) return null;

  return (
    <div>
      <div className="fixed bottom-10 right-1/2 left-1/2 transform -translate-x-1/2 rounded-b max-w-[450px] w-full z-50">
        <div className="bg-secondary-foreground relative rounded-t">
          <div className="w-full px-4 pt-5 pb-3 border-b-[#e4e4e7] border-b">
            <div className="w-full">
              <RxCross1
                onClick={handleClose}
                className="absolute right-3 top-3 transform cursor-pointer transition-transform text-secondary h-4 w-4"
              />
              <div className="flex justify-center">
                <div className="text-card font-bold px-7">
                  No funds in your account
                </div>
              </div>
              <div className="mt-5 flex flex-col justify-center">
                <p className="mb-3 text-center text-sm text-secondary">
                  Deposits are not available in this preview. Reduce your stake
                  or remove the selection.
                </p>
                <Button
                  onClick={handleClose}
                  className="h-[45px]"
                  variant="link"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Overlay />
    </div>
  );
};
