"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { MdClose } from "react-icons/md";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils/cn";
import { useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import { useDialog } from "@/contexts/dialog-context";
import { Dialog } from "@/types/dialog";
import { decimalToFraction } from "@/lib/utils/math";
import { RxCross1 } from "react-icons/rx";

interface Props {
  open: boolean;
  onOpenChange: () => void;
}

const bets = [
  {
    id: 1,
    team: "Samson Dauda",
    market: "Mr. Olympia 2024",
    odds: 1.6,
    stake: 10,
  },
];

const MAX_STAKE = 1000;

export const PlaceBetDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { openDialog } = useDialog();
  const [isExpanded, setIsExpanded] = useState(false);
  const [stakeDisplayValue, setStakeDisplayValue] = useState("");
  const [stakeRawValue, setStakeRawValue] = useState("");
  const [isEditingStake, setIsEditingStake] = useState(false);
  const stakeRef = useRef<HTMLInputElement | null>(null);

  const handleSetStakeClick = () => {
    setIsEditingStake(true);
    setTimeout(() => stakeRef.current?.focus(), 0); // Focus input after state update
  };

  const formatAsCurrency = (value: string) => {
    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^\d.]/g, "");

    // Ensure only one decimal point
    const parts = cleanValue.split(".");
    const wholePart = parts[0];
    const decimalPart = parts[1] || "";

    // Add commas to the whole number part
    const formattedWholePart = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    // Combine with decimal part (limited to 2 places)
    return decimalPart
      ? `${formattedWholePart}.${decimalPart.slice(0, 2)}`
      : formattedWholePart;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^\d.]/g, "");

    // Ensure only one decimal point
    const parts = cleanValue.split(".");
    if (parts.length > 2) return;

    // Check if the value exceeds maximum stake
    const numericValue = parseFloat(cleanValue);
    if (numericValue > MAX_STAKE) return;

    setStakeRawValue(cleanValue);
    setStakeDisplayValue(formatAsCurrency(cleanValue));
  };

  const handleBlur = () => {
    if (!stakeRawValue) return;

    // Add .00 if no decimal places exist
    let formattedValue = stakeRawValue;
    if (!formattedValue.includes(".")) {
      formattedValue += ".00";
    } else {
      // Ensure exactly 2 decimal places
      const parts = formattedValue.split(".");
      formattedValue = `${parts[0]}.${(parts[1] + "00").slice(0, 2)}`;
    }

    setStakeRawValue(formattedValue);
    setStakeDisplayValue(formatAsCurrency(formattedValue));
  };

  const totalStake = bets.reduce((sum, bet) => sum + bet.stake, 0);
  const potentialWinnings = bets.reduce(
    (sum, bet) => sum + bet.stake * bet.odds,
    0
  );
  const latestBet = bets[bets.length - 1];

  if (bets.length === 0) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <div className="fixed bottom-10 right-1/2 left-1/2 transform -translate-x-1/2 rounded-b max-w-[450px] w-full z-50">
        <div className="border-b-white px-3 pt-3 pb-4 flex justify-between bg-secondary-foreground rounded-t">
          <div className="flex gap-2">
            <RxCross1 className="cursor-pointer mt-[5px] text-secondary h-3.5 w-3.5" />
            <div>
              <div>
                <h3 className="text-primary font-bold">{latestBet.team}</h3>
                <div className="text-sm text-secondary font-semibold">
                  To Win
                </div>
                <div className="text-sm text-secondary">{latestBet.market}</div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <div>
              <p className="text-secondary font-medium">
                {decimalToFraction(latestBet.odds)}
              </p>
            </div>
            <div className="border-l-[#e4e4e7] border-l pl-3 flex justify-center items-center">
              <ChevronUp
                onClick={() => openDialog(Dialog.PlaceBet)}
                className={cn(
                  "transform cursor-pointer transition-transform text-secondary h-5 w-5",
                  isExpanded && "rotate-180"
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex">
          <div className="w-1/2 h-[50px] bg-muted flex items-center py-4 px-3 rounded-bl border-r">
            {isEditingStake ? (
              <div className="flex flex-col gap-1">
                <label htmlFor="stake-input" className="text-white text-[11px]">
                  Stake
                </label>
                <div className="relative flex items-center">
                  {/* <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-bold text-white"> */}
                  <span className="absolute left-0 font-bold text-cta text-[17px]">
                    £
                  </span>
                  <Input
                    type="text"
                    ref={stakeRef}
                    value={stakeDisplayValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-label="Stake amount"
                    className="w-full pl-3.5 pr-2 text-[19px] text-cta h-3 bg-secondary rounded-sm border-none outline-none focus:ring-0 focus-visible:ring-0 focus:outline-none focus-visible:ring-offset-0 focus-visible:border-none focus-visible:ring-transparent placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            ) : (
              <div
                onClick={handleSetStakeClick}
                className="font-extrabold text-cta cursor-pointer"
              >
                Set Stake
              </div>
            )}
          </div>

          <Button
            className={cn(
              "w-1/2 h-[50px] flex font-extrabold justify-center items-center py-4 px-3 rounded-none rounded-br",
              { "bg-primary": parseFloat(stakeRawValue) > 0 },
              {
                "bg-muted-foreground text-secondary":
                  parseFloat(stakeRawValue) === 0,
              }
            )}
          >
            Place Bet
          </Button>
        </div>
      </div>
      <DrawerContent>
        <div className="mx-auto w-full max-w-[480px]">
          <DrawerHeader className="flex items-center justify-between">
            <div className="flex items-start">
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6 shrink-0 rounded-full mr-2 bg-primary"
              >
                2
              </Button>
              <div>
                <DrawerTitle className="mt-1">Selections</DrawerTitle>
                <DrawerDescription>Place your bets.</DrawerDescription>
              </div>
            </div>
            <div className="flex flex-col space-y-0 justify-end text-right">
              <span className="text-xs">Balance</span>
              <span className="text-xs">£0.00</span>
            </div>
          </DrawerHeader>
          <div className="flex flex-col space-y-2">
            <div className="px-4 py-0">
              <Card className="bg-background">
                <CardContent className="flex px-2 py-4">
                  <div className="flex flex-[1_1_100%]">
                    <div className="flex space-x-2">
                      <div>
                        <MdClose className="h-[17px] w-[17px]" />
                        <span className="sr-only">Remove</span>
                      </div>
                      <div>
                        <div className="flex-auto flex flex-wrap">
                          <div className="flex-[1_1_100%] flex items-center">
                            <CardTitle className="text-base text-primary">
                              Samson Dauda
                            </CardTitle>
                            <div className="text-right inline font-bold flex-auto">
                              <span className="leading-5 inline-block p-0 my-0 mx-1 text-sm">
                                <span>15/8</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-start">
                            <div className="text-[13px] font-bold text-card-foreground leading-5 pr-[6px] flex items-start whitespace-normal">
                              To Win
                            </div>
                          </div>
                        </div>
                        <div className="whitespace-normal flex">
                          <div className="flex flex-[1_1_100%]">
                            <div className="flex-auto pr-[5px] flex items-start">
                              <CardDescription className="mt-0 text-xs leading-5 text-left whitespace-normal">
                                Mr. Olympia 2024
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-28 flex-[0_0_115px]">
                    <Input
                      placeholder="Stake"
                      className="rounded-sm placeholder:text-right"
                    />
                    <p className="text-xs text-muted-foreground text-right pt-1">
                      To Return £0.00
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="px-4 py-0">
              <Card className="bg-background">
                <CardContent className="flex px-2 py-4">
                  <div className="flex flex-[1_1_100%]">
                    <div className="flex space-x-2">
                      <div>
                        <MdClose className="h-[17px] w-[17px]" />
                        <span className="sr-only">Remove</span>
                      </div>
                      <div>
                        <div className="flex-auto flex flex-wrap">
                          <div className="flex-[1_1_100%] flex items-center">
                            <CardTitle className="text-base text-primary">
                              Samson Dauda
                            </CardTitle>
                            <div className="text-right inline font-bold flex-auto">
                              <span className="leading-5 inline-block p-0 my-0 mx-1 text-sm">
                                <span>15/8</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-start">
                            <div className="text-[13px] font-bold text-card-foreground leading-5 pr-[6px] flex items-start whitespace-normal">
                              To Win
                            </div>
                          </div>
                        </div>
                        <div className="whitespace-normal flex">
                          <div className="flex flex-[1_1_100%]">
                            <div className="flex-auto pr-[5px] flex items-start">
                              <CardDescription className="mt-0 text-xs leading-5 text-left whitespace-normal">
                                Mr. Olympia 2024
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-28 flex-[0_0_115px]">
                    <Input
                      placeholder="Stake"
                      className="rounded-sm placeholder:text-right"
                    />
                    <p className="text-xs text-muted-foreground text-right pt-1">
                      To Return £0.00
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="px-4 py-0">
              <Card className="bg-background">
                <CardContent className="flex px-2 py-4">
                  <div className="flex flex-[1_1_100%]">
                    <div className="flex space-x-2">
                      <div>
                        <MdClose className="h-[17px] w-[17px]" />
                        <span className="sr-only">Remove</span>
                      </div>
                      <div>
                        <div className="flex-auto flex flex-wrap">
                          <div className="flex-[1_1_100%] flex items-center">
                            <CardTitle className="text-base text-primary">
                              Samson Dauda
                            </CardTitle>
                            <div className="text-right inline font-bold flex-auto">
                              <span className="leading-5 inline-block p-0 my-0 mx-1 text-sm">
                                <span>15/8</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-start">
                            <div className="text-[13px] font-bold text-card-foreground leading-5 pr-[6px] flex items-start whitespace-normal">
                              To Win
                            </div>
                          </div>
                        </div>
                        <div className="whitespace-normal flex">
                          <div className="flex flex-[1_1_100%]">
                            <div className="flex-auto pr-[5px] flex items-start">
                              <CardDescription className="mt-0 text-xs leading-5 text-left whitespace-normal">
                                Mr. Olympia 2024
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-28 flex-[0_0_115px]">
                    <Input
                      placeholder="Stake"
                      className="rounded-sm placeholder:text-right"
                    />
                    <p className="text-xs text-muted-foreground text-right pt-1">
                      To Return £0.00
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <DrawerFooter>
            <Button className="flex flex-col items-center h-13">
              <div className="text-base font-bold">Place bet £0.00</div>
              <div className="text-xs">To return £0.00</div>
            </Button>
            {/* <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose> */}
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>

    // Old UI
    // <Drawer open={open} onOpenChange={onOpenChange}>
    //   <div className="fixed bottom-0 right-1/2 left-1/2 transform -translate-x-1/2 bg-muted max-w-[450px] w-full z-50">
    //     <div className="border-b p-3 flex items-center justify-between bg-primary rounded-t">
    //       <div className="flex items-center gap-2">
    //         <Button
    //           variant="ghost"
    //           onClick={() => openDialog(Dialog.PlaceBet)}
    //           className="p-0 bg-transparent hover:bg-transparent"
    //         >
    //           <ChevronUp
    //             className={cn(
    //               "transform transition-transform text-secondary",
    //               isExpanded && "rotate-180"
    //             )}
    //           />
    //         </Button>
    //         {/* <div className="flex items-center">
    //           <Button
    //             variant="outline"
    //             size="icon"
    //             className="h-6 w-6 shrink-0 rounded-full mr-2 bg-primary"
    //           >
    //             2
    //           </Button>
    //           <div>
    //             <DrawerTitle>Selections</DrawerTitle>
    //           </div>
    //         </div> */}
    //         <h2 className="font-semibold text-secondary">
    //           {`${bets.length} Selection${bets.length > 1 ? "s" : ""}`}
    //         </h2>
    //       </div>
    //       <div className="text-sm font-medium text-secondary">
    //         Total Stake:{" "}
    //         <span className="text-cta">£{totalStake.toFixed(2)}</span>
    //       </div>
    //     </div>

    //     <div className="p-4 flex items-center justify-between">
    //       {latestBet && (
    //         <>
    //           <div>
    //             <h3 className="font-medium">{latestBet.team}</h3>
    //             <p className="text-sm">
    //               {latestBet.market} @{latestBet.odds.toFixed(2)}
    //             </p>
    //           </div>
    //           <div className="flex items-center gap-4">
    //             <div className="flex items-center space-x-2">
    //               <div className="min-w-28 flex-[0_0_115px]">
    //                 <Input
    //                   placeholder="Set Stake"
    //                   className="rounded-sm placeholder:text-right bg-secondary"
    //                 />
    //                 <p className="text-xs text-muted-foreground text-right pt-1">
    //                   To Return £0.00
    //                 </p>
    //               </div>
    //               {/* <input
    //                 type="number"
    //                 value={latestBet.stake}
    //                 // onChange={(e) => onUpdateStake(latestBet.id, Math.max(0, Number(e.target.value)))}
    //                 className="w-20 text-center border rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-green-500"
    //               /> */}
    //             </div>
    //             <Button>Place Bet</Button>
    //           </div>
    //         </>
    //       )}
    //     </div>
    //   </div>
    //   <DrawerContent>
    //     <div className="mx-auto w-full max-w-[480px]">
    //       <DrawerHeader className="flex items-center justify-between">
    //         <div className="flex items-start">
    //           <Button
    //             variant="outline"
    //             size="icon"
    //             className="h-6 w-6 shrink-0 rounded-full mr-2 bg-primary"
    //           >
    //             2
    //           </Button>
    //           <div>
    //             <DrawerTitle className="mt-1">Selections</DrawerTitle>
    //             <DrawerDescription>Place your bets.</DrawerDescription>
    //           </div>
    //         </div>
    //         <div className="flex flex-col space-y-0 justify-end text-right">
    //           <span className="text-xs">Balance</span>
    //           <span className="text-xs">£0.00</span>
    //         </div>
    //       </DrawerHeader>
    //       <div className="flex flex-col space-y-2">
    //         <div className="px-4 py-0">
    //           <Card className="bg-background">
    //             <CardContent className="flex px-2 py-4">
    //               <div className="flex flex-[1_1_100%]">
    //                 <div className="flex space-x-2">
    //                   <div>
    //                     <MdClose className="h-[17px] w-[17px]" />
    //                     <span className="sr-only">Remove</span>
    //                   </div>
    //                   <div>
    //                     <div className="flex-auto flex flex-wrap">
    //                       <div className="flex-[1_1_100%] flex items-center">
    //                         <CardTitle className="text-base text-primary">
    //                           Samson Dauda
    //                         </CardTitle>
    //                         <div className="text-right inline font-bold flex-auto">
    //                           <span className="leading-5 inline-block p-0 my-0 mx-1 text-sm">
    //                             <span>15/8</span>
    //                           </span>
    //                         </div>
    //                       </div>
    //                       <div className="flex items-center justify-start">
    //                         <div className="text-[13px] font-bold text-card-foreground leading-5 pr-[6px] flex items-start whitespace-normal">
    //                           To Win
    //                         </div>
    //                       </div>
    //                     </div>
    //                     <div className="whitespace-normal flex">
    //                       <div className="flex flex-[1_1_100%]">
    //                         <div className="flex-auto pr-[5px] flex items-start">
    //                           <CardDescription className="mt-0 text-xs leading-5 text-left whitespace-normal">
    //                             Mr. Olympia 2024
    //                           </CardDescription>
    //                         </div>
    //                       </div>
    //                     </div>
    //                   </div>
    //                 </div>
    //               </div>
    //               <div className="min-w-28 flex-[0_0_115px]">
    //                 <Input
    //                   placeholder="Stake"
    //                   className="rounded-sm placeholder:text-right"
    //                 />
    //                 <p className="text-xs text-muted-foreground text-right pt-1">
    //                   To Return £0.00
    //                 </p>
    //               </div>
    //             </CardContent>
    //           </Card>
    //         </div>
    //         <div className="px-4 py-0">
    //           <Card className="bg-background">
    //             <CardContent className="flex px-2 py-4">
    //               <div className="flex flex-[1_1_100%]">
    //                 <div className="flex space-x-2">
    //                   <div>
    //                     <MdClose className="h-[17px] w-[17px]" />
    //                     <span className="sr-only">Remove</span>
    //                   </div>
    //                   <div>
    //                     <div className="flex-auto flex flex-wrap">
    //                       <div className="flex-[1_1_100%] flex items-center">
    //                         <CardTitle className="text-base text-primary">
    //                           Samson Dauda
    //                         </CardTitle>
    //                         <div className="text-right inline font-bold flex-auto">
    //                           <span className="leading-5 inline-block p-0 my-0 mx-1 text-sm">
    //                             <span>15/8</span>
    //                           </span>
    //                         </div>
    //                       </div>
    //                       <div className="flex items-center justify-start">
    //                         <div className="text-[13px] font-bold text-card-foreground leading-5 pr-[6px] flex items-start whitespace-normal">
    //                           To Win
    //                         </div>
    //                       </div>
    //                     </div>
    //                     <div className="whitespace-normal flex">
    //                       <div className="flex flex-[1_1_100%]">
    //                         <div className="flex-auto pr-[5px] flex items-start">
    //                           <CardDescription className="mt-0 text-xs leading-5 text-left whitespace-normal">
    //                             Mr. Olympia 2024
    //                           </CardDescription>
    //                         </div>
    //                       </div>
    //                     </div>
    //                   </div>
    //                 </div>
    //               </div>
    //               <div className="min-w-28 flex-[0_0_115px]">
    //                 <Input
    //                   placeholder="Stake"
    //                   className="rounded-sm placeholder:text-right"
    //                 />
    //                 <p className="text-xs text-muted-foreground text-right pt-1">
    //                   To Return £0.00
    //                 </p>
    //               </div>
    //             </CardContent>
    //           </Card>
    //         </div>
    //         <div className="px-4 py-0">
    //           <Card className="bg-background">
    //             <CardContent className="flex px-2 py-4">
    //               <div className="flex flex-[1_1_100%]">
    //                 <div className="flex space-x-2">
    //                   <div>
    //                     <MdClose className="h-[17px] w-[17px]" />
    //                     <span className="sr-only">Remove</span>
    //                   </div>
    //                   <div>
    //                     <div className="flex-auto flex flex-wrap">
    //                       <div className="flex-[1_1_100%] flex items-center">
    //                         <CardTitle className="text-base text-primary">
    //                           Samson Dauda
    //                         </CardTitle>
    //                         <div className="text-right inline font-bold flex-auto">
    //                           <span className="leading-5 inline-block p-0 my-0 mx-1 text-sm">
    //                             <span>15/8</span>
    //                           </span>
    //                         </div>
    //                       </div>
    //                       <div className="flex items-center justify-start">
    //                         <div className="text-[13px] font-bold text-card-foreground leading-5 pr-[6px] flex items-start whitespace-normal">
    //                           To Win
    //                         </div>
    //                       </div>
    //                     </div>
    //                     <div className="whitespace-normal flex">
    //                       <div className="flex flex-[1_1_100%]">
    //                         <div className="flex-auto pr-[5px] flex items-start">
    //                           <CardDescription className="mt-0 text-xs leading-5 text-left whitespace-normal">
    //                             Mr. Olympia 2024
    //                           </CardDescription>
    //                         </div>
    //                       </div>
    //                     </div>
    //                   </div>
    //                 </div>
    //               </div>
    //               <div className="min-w-28 flex-[0_0_115px]">
    //                 <Input
    //                   placeholder="Stake"
    //                   className="rounded-sm placeholder:text-right"
    //                 />
    //                 <p className="text-xs text-muted-foreground text-right pt-1">
    //                   To Return £0.00
    //                 </p>
    //               </div>
    //             </CardContent>
    //           </Card>
    //         </div>
    //       </div>
    //       <DrawerFooter>
    //         <Button className="flex flex-col items-center h-13">
    //           <div className="text-base font-bold">Place bet £0.00</div>
    //           <div className="text-xs">To return £0.00</div>
    //         </Button>
    //         {/* <DrawerClose asChild>
    //           <Button variant="outline">Cancel</Button>
    //         </DrawerClose> */}
    //       </DrawerFooter>
    //     </div>
    //   </DrawerContent>
    // </Drawer>
  );
};
