"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils/cn";
import { FocusEvent, useCallback, useEffect, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import { RxCross1 } from "react-icons/rx";
import { Label } from "../ui/label";
import {
  invalidStakeValues,
  MAX_BETTING_STAKE,
  useBet,
  useBetActions,
} from "@/store/betting";
import {
  findMostRecentBet,
  getBetSelectionsDisplay,
  getBetTypeDisplay,
  roundOddsToFractional,
} from "@/lib/utils/betting";
import { BetDialogAlert } from "../alerts/bet-dialog-alert";
import { formatCurrency, getCurrencySymbol } from "@/lib/utils/currency";
import { useUser } from "@/store/user/user-context";
import { Badge } from "../ui/badge";
import { Overlay } from "../overlay";

interface Props {
  open: boolean;
  onOpenChange: () => void;
}

export const PlaceBetDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const user = useUser();
  const {
    alert,
    removeBet,
    clearAllBets,
    updateStakeMultiplier,
    updateBetAmount,
  } = useBetActions();
  const { state } = useBet();
  const {
    totalStake,
    activeBets,
    alertMsg,
    totalFractionalOdds,
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
  const stakeMultiplierContainerRef = useRef<HTMLDivElement | null>(null);
  const betSlipContainerRef = useRef<HTMLDivElement | null>(null);

  const memoizedAlert = useCallback(alert, [alert]);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

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

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    // Only handle blur if clicking outside the container
    if (
      stakeMultiplierContainerRef.current &&
      !stakeMultiplierContainerRef.current.contains(event.relatedTarget)
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

  const handleRemoveAllBets = () => {
    clearAllBets();
  };

  const handleRemoveBet = (id: string) => {
    removeBet(id);
  };

  const handleBetAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    betId: string
  ) => {
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

    updateBetAmount(betId, cleanValue);
  };

  const handleBetAmountBlur = (
    e: FocusEvent<HTMLInputElement>,
    betId: string
  ) => {
    const { value } = e.target;

    // Add .00 if no decimal places exist
    let formattedValue = value;
    if (!formattedValue.includes(".")) {
      formattedValue += ".00";
    } else {
      // Ensure exactly 2 decimal places
      const parts = formattedValue.split(".");
      formattedValue = `${parts[0]}.${(parts[1] + "00").slice(0, 2)}`;
    }

    if (invalidStakeValues.includes(formattedValue)) {
      updateBetAmount(betId, "");
      return;
    }

    updateBetAmount(betId, formattedValue);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        stakeMultiplierContainerRef.current &&
        !stakeMultiplierContainerRef.current.contains(event.target as Node) &&
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        betSlipContainerRef.current &&
        !betSlipContainerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded, setIsExpanded]);

  if (!user || activeBets.length === 0) return null;

  const renderMinimisedBetSlip = () => {
    return (
      <div
        className={cn(
          "border-b-white px-3 pt-2.5 pb-3.5 flex justify-between bg-secondary-foreground rounded-t",
          {
            "rounded-t-none": alertMsg,
          }
        )}
      >
        <div className="flex gap-2 w-full">
          <RxCross1
            onClick={handleRemoveAllBets}
            className="cursor-pointer mt-[4px] text-secondary h-3.5 w-3.5"
          />
          <div className="w-full">
            <div>
              <div className="flex justify-between w-full pr-3">
                {activeBets.length > 1 ? (
                  <h3 className="text-secondary font-extrabold text-[15px]">
                    {getBetSelectionsDisplay(activeBets.length)}
                  </h3>
                ) : (
                  <h3 className="text-primary font-bold">
                    {latestBet?.competitor.first_name}{" "}
                    {latestBet?.competitor.last_name}
                  </h3>
                )}
                <div>
                  <p className="text-secondary font-medium text-[15px]">
                    {state.totalFractionalOdds}
                  </p>
                </div>
              </div>
              <div className="text-sm text-secondary font-semibold">
                {activeBets.length === 1 ? (
                  <>{getBetTypeDisplay(latestBet?.betType)}</>
                ) : (
                  <div className="flex gap-1 items-center flex-wrap">
                    {activeBets.map((bet, index, arr) => (
                      <div
                        key={bet._id}
                        className="text-primary text-[13px] font-bold"
                      >
                        {bet.competitor.first_name} {bet.competitor.last_name}
                        {arr.length !== index + 1 && ","}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-sm text-secondary">
                {activeBets.length === 1 ? (
                  <>{latestBet?.show.name}</>
                ) : (
                  <div className="flex gap-1 items-center mt-3 flex-wrap">
                    {activeBets.map((bet) => (
                      <Badge
                        key={bet._id}
                        variant="secondary"
                        className="px-1.5 text-[11px] leading-[14px] hover:bg-secondary"
                      >
                        {bet.division.category}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {activeBets.length > 1 && (
            <div className="border-l-[#e4e4e7] border-l pl-3 flex justify-center items-center">
              <ChevronUp
                onClick={handleToggleExpand}
                className={cn(
                  "transform cursor-pointer transition-transform text-secondary h-5 w-5",
                  isExpanded && "rotate-180"
                )}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderExpandedBetSlip = () => {
    return (
      <div
        className={cn("bg-secondary-foreground rounded-t", {
          "rounded-t-none": alertMsg,
        })}
      >
        <div className="w-full px-3 pt-3 pb-1.5 border-b-[#e4e4e7] border-b">
          <div className="w-full">
            <div>
              <div className="flex justify-between w-full">
                <div className="flex gap-1.5">
                  <div className="flex text-[13px] mt-0.5 justify-center items-center w-5 h-5 rounded-full bg-primary text-secondary font-extrabold">
                    {activeBets.length}
                  </div>
                  <div>
                    <div className="text-secondary font-extrabold text-[15px] leading-5">
                      Selections
                    </div>
                    <div
                      onClick={handleRemoveAllBets}
                      className="text-primary cursor-pointer text-[12px] hover:text-primary hover:underline"
                    >
                      Remove all
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col text-secondary">
                    <div className="text-[11px] leading-[15px] text-right">
                      Balance
                    </div>
                    <div className="text-xs font-bold leading-[15px] text-right">
                      {getCurrencySymbol(user.defaultCurrency)}
                      {formatCurrency(user.balance)}
                    </div>
                  </div>
                  <div className="flex justify-center mb-2 items-center">
                    <RxCross1
                      onClick={handleToggleExpand}
                      className={cn(
                        "transform cursor-pointer transition-transform text-secondary h-4 w-4",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-[#f0f0f0] px-2 pb-4 overflow-x-hidden overflow-y-auto relative">
          <div className="flex gap-1 items-center mt-4 flex-wrap">
            {activeBets.map((bet) => (
              <Badge
                key={bet._id}
                variant="secondary"
                className="px-1.5 text-[11px] leading-[14px] hover:bg-secondary"
              >
                {bet.division.category}
              </Badge>
            ))}
          </div>

          <div className="px-3 mt-4 py-4 border bg-secondary-foreground border-[#e4e4e7]">
            <div className="flex gap-3 w-full">
              <div className="flex flex-col gap-3 w-full flex-[1_1_100%]">
                {activeBets.map((bet) => (
                  <div key={bet._id} className="flex gap-2 w-full">
                    <RxCross1
                      onClick={() => handleRemoveBet(bet._id)}
                      className="cursor-pointer mt-[11px] text-secondary h-5 w-5"
                    />
                    <div className="w-full mt-2.5">
                      <div>
                        <div className="flex justify-between w-full">
                          <div className="text-primary font-extrabold text-[15px]">
                            {bet.competitor.first_name}{" "}
                            {bet.competitor.last_name}
                          </div>
                          <div>
                            <p className="text-secondary font-bold text-sm">
                              {roundOddsToFractional(bet.odds)}
                            </p>
                          </div>
                        </div>
                        <div className="text-[13px] text-secondary font-bold">
                          {getBetTypeDisplay(bet.betType)}
                        </div>
                        <div className="text-[12px] text-secondary">
                          <>
                            {bet.show.name} ({bet.division.category})
                          </>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Input
                        type="text"
                        value={bet.amount || ""}
                        onChange={(e) => handleBetAmountChange(e, bet._id)}
                        onBlur={(e) => handleBetAmountBlur(e, bet._id)}
                        aria-label="Stake amount"
                        placeholder="Stake"
                        className="w-28 h-[38px] text-sm text-right rounded-sm bg-white outline-none focus:ring-0 focus-visible:ring-0 focus:outline-none focus-visible:ring-offset-0 focus-visible:ring-transparent placeholder:text-muted-foreground text-card"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 w-full pt-3">
              <div className="flex flex-col gap-3 w-full flex-[1_1_100%]">
                <div className="flex gap-2 w-full">
                  <div className="w-full mt-2.5">
                    <div>
                      <div className="flex justify-between w-full">
                        <div className="text-primary font-extrabold text-[15px]">
                          {getBetSelectionsDisplay(activeBets.length)}
                        </div>
                        <div>
                          <p className="text-secondary font-bold text-sm">
                            {totalFractionalOdds}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Input
                      type="text"
                      // TODO:
                      // value={bet.amount || ""}
                      // onChange={(e) => handleBetAmountChange(e, bet._id)}
                      // onBlur={(e) => handleBetAmountBlur(e, bet._id)}
                      aria-label="Stake amount"
                      placeholder="Stake"
                      className="w-28 h-[38px] text-sm text-right rounded-sm bg-white outline-none focus:ring-0 focus-visible:ring-0 focus:outline-none focus-visible:ring-offset-0 focus-visible:ring-transparent placeholder:text-muted-foreground text-card"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div
        ref={betSlipContainerRef}
        className="fixed bottom-10 right-1/2 left-1/2 transform -translate-x-1/2 rounded-b max-w-[450px] w-full z-50"
      >
        {alertMsg && <BetDialogAlert alertMsg={alertMsg} />}
        {!isExpanded && renderMinimisedBetSlip()}
        {isExpanded && renderExpandedBetSlip()}
        {isExpanded ? (
          <Button
            className={cn(
              "w-full h-[50px] flex flex-col gap-0.5 bg-primary hover:bg-[#52c466] justify-center items-center py-4 px-3 rounded-none rounded-br",
              {
                "bg-muted-foreground text-secondary hover:bg-muted-foreground cursor-not-allowed":
                  !stakeMultiplierRawValue ||
                  invalidStakeValues.includes(stakeMultiplierDisplayValue),
              }
            )}
          >
            <div className="text-white text-base font-extrabold">
              Place Bet {formatCurrency(totalStake)}
            </div>
            {activeBets.length > 0 && potentialReturn > 0 && (
              <div className="text-[11px] leading-[13px] font-bold">
                To Return {formatCurrency(potentialReturn)}
              </div>
            )}
          </Button>
        ) : (
          <div className="flex">
            <div
              ref={stakeMultiplierContainerRef}
              className="relative w-1/2 h-[50px] bg-muted flex items-center py-4 px-3 rounded-bl border-r"
            >
              <div>
                {isEditingStake && (
                  <div className="flex flex-col gap-1 w-full">
                    <label
                      htmlFor="stake-input"
                      className="text-white text-[11px]"
                    >
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
                )}
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
              {!isEditingStake && (
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
                "w-1/2 h-[50px] flex flex-col gap-0.5 bg-primary hover:bg-[#52c466] justify-center items-center py-4 px-3 rounded-none rounded-br",
                {
                  "bg-muted-foreground text-secondary hover:bg-muted-foreground cursor-not-allowed":
                    !stakeMultiplierRawValue ||
                    invalidStakeValues.includes(stakeMultiplierDisplayValue),
                }
              )}
            >
              <div className="text-white text-base font-extrabold">
                Place Bet
              </div>
              {activeBets.length > 0 &&
                stakeMultiplierRawValue &&
                potentialReturn > 0 && (
                  <div className="text-[11px] leading-[13px] font-bold">
                    To Return {formatCurrency(potentialReturn)}
                  </div>
                )}
            </Button>
          </div>
        )}
      </div>
      {isExpanded && <Overlay />}
    </div>
  );
};
