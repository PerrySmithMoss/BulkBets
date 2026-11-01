import React, { useState, useEffect } from "react";

interface BetDialogAlertProps {
  alertMsg?: string;
}

export const BetDialogAlert: React.FC<BetDialogAlertProps> = ({ alertMsg }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (alertMsg) {
      // Set a timer to remove the alert after 3 seconds
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);

      // Cleanup the timer if the component unmounts or alertMsg changes
      return () => clearTimeout(timer);
    }
  }, [alertMsg]);

  if (!visible || !alertMsg) return null;

  return (
    <div className="p-1.5 text-center flex justify-center bg-destructive text-xs rounded-t">
      {alertMsg}
    </div>
  );
};
