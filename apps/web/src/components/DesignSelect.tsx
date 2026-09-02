import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

export type DesignSelectOption<TValue extends string = string> = {
  label: string;
  value: TValue;
};

type DesignSelectProps<TValue extends string = string> = {
  label: string;
  onValueChange: (value: TValue) => void;
  options: DesignSelectOption<TValue>[];
  value: TValue;
};

export const DesignSelect = <TValue extends string = string>({
  label,
  onValueChange,
  options,
  value,
}: DesignSelectProps<TValue>) => (
  <Select.Root value={value} onValueChange={(nextValue) => onValueChange(nextValue as TValue)}>
    <Select.Trigger className="design-select-trigger" aria-label={label}>
      <Select.Value />
      <Select.Icon asChild>
        <ChevronDown size={17} />
      </Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content className="design-select-content" position="popper" sideOffset={8}>
        <Select.Viewport className="design-select-viewport">
          {options.map((option) => (
            <Select.Item className="design-select-item" key={option.value} value={option.value}>
              <Select.ItemText>{option.label}</Select.ItemText>
              <Select.ItemIndicator className="design-select-indicator">
                <Check size={15} />
              </Select.ItemIndicator>
            </Select.Item>
          ))}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);