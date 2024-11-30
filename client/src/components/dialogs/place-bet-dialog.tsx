"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils/cn";
import { FocusEvent, useCallback, useEffect, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import { decimalToFraction } from "@/lib/utils/math";
import { RxCross1 } from "react-icons/rx";
import { Label } from "../ui/label";
import {
  invalidStakeValues,
  MAX_BETTING_STAKE,
  useBet,
  useBetActions,
} from "@/store/betting";
import { findMostRecentBet, getBetTypeDisplay } from "@/lib/utils/betting";
import { BetDialogAlert } from "../alerts/bet-dialog-alert";
import { formatCurrency } from "@/lib/utils/currency";

interface Props {
  open: boolean;
  onOpenChange: () => void;
}

export const PlaceBetDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { alert, clearAllBets, updateStakeMultiplier } = useBetActions();
  const { state } = useBet();
  console.log("state: ", state);
  const {
    activeBets,
    alertMsg,
    stakeMultiplierDisplayValue,
    stakeMultiplierRawValue,
    potentialReturn,
  } = state;
  const [visibleAlert, setVisibleAlert] = useState<string | null>(
    alertMsg || null
  );
  const latestBet = findMostRecentBet(activeBets);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingStake, setIsEditingStake] = useState(false);
  const [rememberStake, setRememberStake] = useState(false);
  const stakeRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const memoizedAlert = useCallback(alert, [alert]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    // Prevent more than one leading zero
    if (value.startsWith("00")) {
      return;
    }

    // Remove leading zero if followed by another digit
    let formattedValue = value;
    if (
      formattedValue.length > 1 &&
      formattedValue.startsWith("0") &&
      /\d/.test(formattedValue[1])
    ) {
      formattedValue = formattedValue.slice(1);
    }

    // Remove any non-numeric characters except decimal point
    const cleanValue = formattedValue.replace(/[^\d.]/g, "");

    // Ensure only one decimal point and limit to 2 decimal places
    const parts = cleanValue.split(".");
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;

    // Check if the value exceeds maximum stake
    const numericValue = parseFloat(cleanValue);
    if (numericValue > MAX_BETTING_STAKE) return;

    updateStakeMultiplier(cleanValue);
  };

  const handleStakeBlur = useCallback((): void => {
    if (!stakeMultiplierRawValue) {
      setIsEditingStake(!isEditingStake);
      return;
    }

    // Add .00 if no decimal places exist
    let formattedValue = stakeMultiplierRawValue;
    if (!formattedValue.includes(".")) {
      formattedValue += ".00";
    } else {
      // Ensure exactly 2 decimal places
      const parts = formattedValue.split(".");
      formattedValue = `${parts[0]}.${(parts[1] + "00").slice(0, 2)}`;
    }

    if (invalidStakeValues.includes(formattedValue)) {
      updateStakeMultiplier("");
      return;
    }

    updateStakeMultiplier(formattedValue);

    if (!stakeMultiplierRawValue) {
      setIsEditingStake(false);
    }
  }, [isEditingStake, stakeMultiplierRawValue, updateStakeMultiplier]);

  const handleBlur = (event: FocusEvent<HTMLInputElement>): void => {
    // Only handle blur if clicking outside the container
    if (
      containerRef.current &&
      !containerRef.current.contains(event.relatedTarget)
    ) {
      handleStakeBlur();
    }
  };

  const handleSetStakeClick = () => {
    setIsEditingStake(true);
    setTimeout(() => stakeRef.current?.focus(), 0); // Focus input after state update
  };

  const handleRememberStakeChange = (checked: boolean) => {
    setRememberStake(checked);
  };

  const handleRemoveBets = () => {
    clearAllBets();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        isEditingStake
      ) {
        handleStakeBlur();
      }
    };

    // Using mousedown instead of click to ensure it fires before blur
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditingStake, stakeMultiplierRawValue, handleStakeBlur]);

  useEffect(() => {
    if (alertMsg) {
      setVisibleAlert(alertMsg);

      // Set a timer to remove the alert after 3 seconds
      const timer = setTimeout(() => {
        setVisibleAlert(null);
        memoizedAlert("");
      }, 3000);

      // Cleanup the timer if the component unmounts or alertMsg changes
      return () => clearTimeout(timer);
    }
  }, [alertMsg, memoizedAlert]);

  useEffect(() => {
    if (stakeMultiplierDisplayValue) {
      setIsEditingStake(true);
    }
    // we only need check this on initial render as the onChange
    // handlers take care of value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (activeBets.length === 0) return null;

  return (
    <div className="fixed bottom-10 right-1/2 left-1/2 transform -translate-x-1/2 rounded-b max-w-[450px] w-full z-50">
      {alertMsg && <BetDialogAlert alertMsg={alertMsg} />}
      <div
        className={cn(
          "border-b-white px-3 pt-3 pb-4 flex justify-between bg-secondary-foreground rounded-t",
          {
            "rounded-t-none": alertMsg,
          }
        )}
      >
        <div className="flex gap-2">
          <RxCross1
            onClick={handleRemoveBets}
            className="cursor-pointer mt-[5px] text-secondary h-3.5 w-3.5"
          />
          <div>
            <div>
              <h3 className="text-primary font-bold">
                {activeBets.length > 1 ? (
                  <div>{activeBets.length} Selections</div>
                ) : (
                  <div>
                    {latestBet?.competitor.first_name}{" "}
                    {latestBet?.competitor.last_name}
                  </div>
                )}
              </h3>
              <div className="text-sm text-secondary font-semibold">
                {getBetTypeDisplay(latestBet?.betType)}
              </div>
              <div className="text-sm text-secondary">
                {latestBet?.show.name}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <div>
            <p className="text-secondary font-medium">
              {decimalToFraction(latestBet?.odds)}
            </p>
          </div>
          {activeBets.length > 1 && (
            <div className="border-l-[#e4e4e7] border-l pl-3 flex justify-center items-center">
              <ChevronUp
                // onClick={() => openDialog(Dialog.PlaceBet)}
                className={cn(
                  "transform cursor-pointer transition-transform text-secondary h-5 w-5",
                  isExpanded && "rotate-180"
                )}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex">
        <div
          ref={containerRef}
          className="relative w-1/2 h-[50px] bg-muted flex items-center py-4 px-3 rounded-bl border-r"
        >
          {isEditingStake ? (
            <div>
              <div className="flex flex-col gap-1 w-full">
                <label htmlFor="stake-input" className="text-white text-[11px]">
                  Stake
                </label>
                <div className="relative flex items-center w-full">
                  <span className="absolute left-0 font-bold text-cta text-[17px]">
                    £
                  </span>
                  <Input
                    type="text"
                    ref={stakeRef}
                    value={stakeMultiplierDisplayValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-label="Stake amount"
                    className="w-full pl-3.5 pr-2 text-[19px] text-cta h-3 bg-secondary rounded-sm border-none outline-none focus:ring-0 focus-visible:ring-0 focus:outline-none focus-visible:ring-offset-0 focus-visible:border-none focus-visible:ring-transparent placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div className="hover:opacity-100 group transition-opacity absolute right-0 top-1 px-3 pt-1 pb-1.5 flex items-center justify-center flex-col gap-1 opacity-30">
                <Label className="text-[11px]" htmlFor="remember-stake">
                  Remember
                </Label>
                <Switch
                  id="remember-stake"
                  checked={rememberStake}
                  onCheckedChange={handleRememberStakeChange}
                  className="h-3 w-[24px] data-[state=unchecked]:bg-[#585858]"
                />
              </div>
            </div>
          ) : (
            <div
              onClick={handleSetStakeClick}
              className="font-extrabold text-cta cursor-pointer w-full"
            >
              Set Stake
            </div>
          )}
        </div>

        <Button
          className={cn(
            "w-1/2 h-[50px] flex flex-col gap-0.5 font-extrabold bg-primary hover:bg-[#52c466] justify-center items-center py-4 px-3 rounded-none rounded-br",
            {
              "bg-muted-foreground text-secondary hover:bg-muted-foreground":
                !stakeMultiplierRawValue ||
                invalidStakeValues.includes(stakeMultiplierDisplayValue),
            }
          )}
        >
          <div className="text-base leading-5 font-extrabold">Place Bet</div>
          {activeBets.length > 0 && (
            <div className="text-[11px] leading-[13px] font-bold">
              To Return {formatCurrency(potentialReturn)}
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};
