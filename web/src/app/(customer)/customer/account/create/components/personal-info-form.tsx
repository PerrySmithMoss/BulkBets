"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { CountrySelect } from "@/components/country-select";
import { CountryCode } from "@/types/countries";
import { NationalitySelect } from "@/components/nationality-select";
import { Nationalities } from "@/types/nationalities";

export function PersonalInfoForm() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedNationality, setSelectedNationality] = useState("");

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  }

  return (
    <div>
      <form onSubmit={onSubmit}>
        <div className="flex flex-col gap-4">
          <div>
            <Label
              htmlFor="email"
              className="text-sm font-light text-muted-foreground"
            >
              Country of residence
            </Label>
            {/* // TODO: Use the user's location to determine the defaultCountry? */}
            <CountrySelect
              onChange={setSelectedCountry}
              defaultCountry={CountryCode.GB}
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-sm text-muted-foreground">
              Your email address will be used to log in to your account and also
              notify you about important account information.
            </Label>
            <Input
              id="email"
              placeholder="Email address"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              className="rounded mt-4 py-6 font-light text-lg border-muted-foreground/20"
            />
          </div>
          <div>
            <Input
              id="mobile"
              placeholder="Mobile number"
              type="text"
              autoCapitalize="none"
              autoComplete="phone"
              autoCorrect="off"
              disabled={isLoading}
              className="rounded py-6 text-lg font-light border-muted-foreground/20"
            />
          </div>
          <div>
            <Input
              id="first-name"
              placeholder="First name"
              type="text"
              autoCapitalize="none"
              autoComplete="first name"
              autoCorrect="off"
              disabled={isLoading}
              className="rounded-t rounded-b-none font-light py-6 text-lg border-muted-foreground/20"
            />
            <Input
              id="last-name"
              placeholder="Last name"
              type="text"
              autoCapitalize="none"
              autoComplete="last name"
              autoCorrect="off"
              disabled={isLoading}
              className="rounded-b border-t font-light border-muted-foreground/20 rounded-t-none py-6 text-lg"
            />
          </div>
          <div>
            <Label
              htmlFor="email"
              className="text-sm font-normal text-muted-foreground"
            >
              Date of birth
            </Label>
            <Input
              id="dob"
              placeholder="Mobile number"
              type="text"
              autoCapitalize="none"
              autoComplete="phone"
              autoCorrect="off"
              disabled={isLoading}
              className="rounded py-6 text-lg font-light border-muted-foreground/20 mt-2"
            />
          </div>
          <div>
            <Label
              htmlFor="email"
              className="text-sm font-normal text-muted-foreground"
            >
              Nationality
            </Label>
            {/* // TODO: Use the user's location to determine the defaultNationality? */}
            <NationalitySelect
              onChange={setSelectedNationality}
              defaultNationality={Nationalities.GB}
            />
          </div>
          <Button
            disabled={isLoading}
            className="w-full flex items-center text-base gap-1 font-bold py-6 rounded"
          >
            Continue
            {isLoading && <LoadingSpinner />}
          </Button>
        </div>
      </form>
    </div>
  );
}
