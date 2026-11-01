interface BetDialogAlertProps {
  alertMsg?: string;
}
export function BetDialogAlert({ alertMsg }: BetDialogAlertProps) {
  if (!alertMsg) return null;
  return (
    <p
      role="alert"
      className="rounded-t bg-destructive px-4 py-3 text-center text-sm text-destructive-foreground"
    >
      {alertMsg}
    </p>
  );
}
