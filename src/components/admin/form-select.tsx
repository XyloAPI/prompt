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
  placeholder,
  required,
  className,
  triggerClassName,
  onValueChange,
}: {
  name: string;
  items: { value: string; label: string }[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  triggerClassName?: string;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = React.useState<string>(defaultValue ?? "");

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select
        value={value || undefined}
        onValueChange={(v) => {
          setValue(v);
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
