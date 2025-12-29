import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { countries, CountryCode } from "@/types/countries";
import Image from "next/image";
import { useState } from "react";

interface Props {
  onChange: (value: string) => void;
  defaultCountry?: CountryCode;
}

export const CountrySelect: React.FC<Props> = ({
  onChange,
  defaultCountry,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>(
    defaultCountry
  );
  const country = countries.find((c) => c.value === selectedCountry);
  return (
    <Select
      defaultValue={defaultCountry}
      onValueChange={(value) => {
        setSelectedCountry(value);
        onChange(value);
      }}
    >
      <SelectTrigger className="rounded mt-2 py-6 font-light text-lg border-muted-foreground/20">
        <div className="flex items-center gap-2">
          {country && (
            <Image
              src={country.flag}
              alt={`${country.label} flag`}
              width="0"
              height="0"
              sizes="100vw"
              className="w-[24px] h-auto"
            />
          )}
          <span className="ml-2">
            {country ? country.label : "Select a country"}
          </span>
        </div>
      </SelectTrigger>

      <SelectContent>
        {countries.map((country) => (
          <SelectItem
            key={country.value}
            value={country.value}
            className="px-4 py-2 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Image
                src={country.flag}
                alt={`${country.label} flag`}
                width="0"
                height="0"
                sizes="100vw"
                className="w-[24px] h-auto"
              />
              <div className="ml-2">{country.label}</div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
