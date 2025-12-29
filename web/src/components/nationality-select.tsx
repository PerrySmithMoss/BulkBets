import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Nationalities, nationalities } from "@/types/nationalities";
import { useState } from "react";

interface Props {
  onChange: (value: string) => void;
  defaultNationality?: Nationalities;
}

export const NationalitySelect: React.FC<Props> = ({
  onChange,
  defaultNationality,
}) => {
  const [selectedNationality, setSelectedNationality] = useState<
    string | undefined
  >(defaultNationality);
  const nationalityLabel = selectedNationality
    ? nationalities[selectedNationality]
    : "Select a Nationality";
  return (
    <Select
      defaultValue={defaultNationality}
      onValueChange={(value) => {
        setSelectedNationality(value);
        onChange(value);
      }}
    >
      <SelectTrigger className="rounded mt-2 py-6 font-light text-lg border-muted-foreground/20">
        <div className="flex items-center gap-2">
          <span className="ml-2">{nationalityLabel}</span>
        </div>
      </SelectTrigger>

      <SelectContent>
        {Object.entries(nationalities).map(([value, label]) => (
          <SelectItem
            key={value}
            value={value}
            className="px-4 py-2 cursor-pointer"
          >
            <div className="ml-2">{label}</div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
