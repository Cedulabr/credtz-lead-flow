import { forwardRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, label = "Telefone", className, disabled }, ref) => {
    const [displayValue, setDisplayValue] = useState("");

    const formatPhone = (val: string): string => {
      const numbers = val.replace(/\D/g, "").slice(0, 11);
      if (numbers.length <= 2) return `(${numbers}`;
      if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    };

    useEffect(() => {
      if (value) {
        setDisplayValue(formatPhone(value));
      } else {
        setDisplayValue("");
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, "").slice(0, 11);
      onChange(rawValue);
      setDisplayValue(formatPhone(rawValue));
    };

    return (
      <div className={cn("space-y-2", className)}>
        <Label className="text-base font-medium">{label}</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            ref={ref}
            type="tel"
            inputMode="numeric"
            value={displayValue}
            onChange={handleChange}
            placeholder="(00) 00000-0000"
            className="h-12 text-base pl-10"
            maxLength={16}
            disabled={disabled}
          />
        </div>
        {!disabled && (
          <p className="text-xs text-muted-foreground">
            📱 O telefone será usado para contato via WhatsApp
          </p>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
