import { forwardRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientSearch } from "../hooks/useClientSearch";
import { FieldHint } from "./FieldHint";

interface CPFInputProps {
  value: string;
  onChange: (value: string) => void;
  onClientFound?: (nome: string, telefone: string) => void;
  onNewClient?: () => void;
  className?: string;
}

export const CPFInput = forwardRef<HTMLInputElement, CPFInputProps>(
  ({ value, onChange, onClientFound, onNewClient, className }, ref) => {
    const { isSearching, result, searchByCPF, reset } = useClientSearch();
    const [displayValue, setDisplayValue] = useState("");

    const formatCPF = (val: string): string => {
      const numbers = val.replace(/\D/g, "").slice(0, 11);
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
      if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
    };

    useEffect(() => {
      setDisplayValue(formatCPF(value));
    }, [value]);

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, "").slice(0, 11);
      onChange(rawValue);
      setDisplayValue(formatCPF(rawValue));

      if (rawValue.length === 11) {
        const searchResult = await searchByCPF(rawValue);
        if (searchResult.found && searchResult.nome && searchResult.telefone) {
          onClientFound?.(searchResult.nome, searchResult.telefone);
        } else {
          onNewClient?.();
        }
      } else {
        reset();
      }
    };

    return (
      <div className={cn("space-y-2", className)}>
        <Label className="text-base font-medium flex items-center gap-2">
          CPF do Cliente
          {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </Label>
        
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder="000.000.000-00"
          className="h-12 text-lg font-mono tracking-wider"
          maxLength={14}
        />

        {result?.found && (
          <FieldHint type="success">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                <strong>Cliente encontrado!</strong> Última operação: {result.lastOperation?.tipo_operacao} no {result.lastOperation?.banco}
              </span>
            </div>
          </FieldHint>
        )}

        {result && !result.found && value.length === 11 && (
          <FieldHint type="info">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span>Novo cliente! Preencha os dados abaixo.</span>
            </div>
          </FieldHint>
        )}

        {value.length < 11 && value.length > 0 && (
          <p className="text-sm text-muted-foreground">
            💡 Digite os 11 dígitos do CPF para buscar o cliente
          </p>
        )}
      </div>
    );
  }
);

CPFInput.displayName = "CPFInput";
