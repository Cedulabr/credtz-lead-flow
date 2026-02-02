import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  label?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, label, ...props }, ref) => {
    
    const formatDisplay = (val: number | undefined): string => {
      if (val === undefined || val === 0) return "";
      return val.toLocaleString("pt-BR", { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, "");
      if (!rawValue) {
        onChange(undefined);
        return;
      }
      const numericValue = parseInt(rawValue) / 100;
      onChange(numericValue);
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
          R$
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={formatDisplay(value)}
          onChange={handleChange}
          className={cn("pl-10 h-12 text-base font-medium", className)}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
