import React, { useState, useEffect } from "react";

interface BetDialogAlertProps {
  alertMsg?: string;
}

export const BetDialogAlert: React.FC<BetDialogAlertProps> = ({ alertMsg }) => {
  const [visibleAlert, setVisibleAlert] = useState<string | null>(
    alertMsg || null
  );

  useEffect(() => {
    if (alertMsg) {
      setVisibleAlert(alertMsg);

      // Set a timer to remove the alert after 3 seconds
      const timer = setTimeout(() => {
        setVisibleAlert(null);
      }, 3000);

      // Cleanup the timer if the component unmounts or alertMsg changes
      return () => clearTimeout(timer);
    }
  }, [alertMsg]);

  if (!visibleAlert) return null;

  return (
    <div className="p-1.5 text-center flex justify-center bg-destructive text-xs rounded-t">
      {visibleAlert}
    </div>
  );
};
