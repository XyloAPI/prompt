"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function FormSelect({
  name,
  items,
  defaultValue,
  value: controlledValue,
  placeholder,
  required,
  className,
  triggerClassName,
  onValueChange,
}: {
  name: string;
  items: { value: string; label: string }[];
  defaultValue?: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  triggerClassName?: string;
  onValueChange?: (value: string) => void;
}) {
  const [internalValue, setInternalValue] = React.useState<string>(defaultValue ?? "");

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select
        value={value || undefined}
        onValueChange={(v) => {
          setInternalValue(v);
          onValueChange?.(v);
        }}
        required={required}
      >
        <SelectTrigger className={cn("w-full", className, triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </>
  );
}
