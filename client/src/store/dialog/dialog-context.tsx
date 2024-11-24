"use client";

import { Dialog } from "@/types/dialog";
import { createContext, useContext, useState, ReactNode } from "react";

interface DialogContextType {
  activeDialog: Dialog | null;
  openDialog: (dialogName: Dialog) => void;
  closeDialog: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

interface DialogProviderProps {
  children: ReactNode;
}

export const DialogProvider = ({ children }: DialogProviderProps) => {
  const [activeDialog, setActiveDialog] = useState<Dialog | null>(null);

  const openDialog = (dialogName: Dialog) => {
    setActiveDialog(dialogName);
  };

  const closeDialog = () => {
    setActiveDialog(null);
  };

  return (
    <DialogContext.Provider value={{ activeDialog, openDialog, closeDialog }}>
      {children}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }

  return context;
};
