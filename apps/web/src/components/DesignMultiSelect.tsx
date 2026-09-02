import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, X } from "lucide-react";

export type DesignMultiSelectOption = {
  label: string;
  value: string;
};

type DesignMultiSelectProps = {
  clearLabel: string;
  emptyLabel: string;
  label: string;
  onChange: (values: string[]) => void;
  options: DesignMultiSelectOption[];
  selectedLabel: (count: number) => string;
  values: string[];
};

export const DesignMultiSelect = ({
  clearLabel,
  emptyLabel,
  label,
  onChange,
  options,
  selectedLabel,
  values,
}: DesignMultiSelectProps) => {
  const selectedOptions = options.filter((option) => values.includes(option.value));
  const toggleValue = (value: string) => {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  return (
    <div className="design-multi-select">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="design-select-trigger" aria-label={label}>
          <span>{values.length === 0 ? emptyLabel : selectedLabel(values.length)}</span>
          <ChevronDown size={17} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="design-select-content" align="start" sideOffset={8}>
            {options.map((option) => {
              const checked = values.includes(option.value);
              return (
                <DropdownMenu.CheckboxItem
                  checked={checked}
                  className="design-select-item multi"
                  key={option.value}
                  onCheckedChange={() => toggleValue(option.value)}
                  onSelect={(event) => event.preventDefault()}
                >
                  <span>{option.label}</span>
                  <DropdownMenu.ItemIndicator className="design-select-indicator">
                    <Check size={15} />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.CheckboxItem>
              );
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {selectedOptions.length > 0 && (
        <div className="selected-filter-tags">
          <button
            className="selected-filter-tag clear"
            onClick={() => onChange([])}
            type="button"
          >
            {clearLabel}
            <X size={13} />
          </button>
          {selectedOptions.map((option) => (
            <button
              className="selected-filter-tag"
              key={option.value}
              onClick={() => toggleValue(option.value)}
              type="button"
            >
              {option.label}
              <X size={13} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};