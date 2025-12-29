import { cn } from "@/lib/utils/cn";

interface Props {
  className?: string;
}

export const Overlay: React.FC<Props> = ({ className }) => {
  return (
    <div
      className={cn(
        "fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
    />
  );
};
