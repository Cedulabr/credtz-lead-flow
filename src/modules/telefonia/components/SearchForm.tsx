import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Lock, Check } from "lucide-react";
import { formatCpf, isValidCpf, onlyDigits } from "../utils/cpfMask";
import { type Metodo } from "../utils/methodConfig";
import { MethodPicker } from "./MethodPicker";
import { cn } from "@/lib/utils";

interface Props {
  loading: boolean;
  onSubmit: (cpf: string, metodo: Metodo) => void;
  initialCpf?: string;
  lockCpf?: boolean;
}

export function SearchForm({ loading, onSubmit, initialCpf, lockCpf }: Props) {
  const [cpf, setCpf] = useState(() => (initialCpf ? formatCpf(initialCpf) : ""));
  const [metodo, setMetodo] = useState<Metodo>("NVBOOK_CEL_OBG_WHATS");

  useEffect(() => {
    if (initialCpf) setCpf(formatCpf(initialCpf));
  }, [initialCpf]);

  const valid = isValidCpf(cpf);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid || loading) return;
        onSubmit(onlyDigits(cpf), metodo);
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="cpf" className="flex items-center gap-1.5">
          CPF do consultado
          {lockCpf && <Lock className="h-3 w-3 text-muted-foreground" />}
        </Label>
        <div className="relative">
          <Input
            id="cpf"
            inputMode="numeric"
            placeholder="___.___.___-__"
            value={cpf}
            onChange={(e) => !lockCpf && setCpf(formatCpf(e.target.value))}
            maxLength={14}
            autoFocus={!lockCpf}
            readOnly={lockCpf}
            className={cn(
              "pr-10 font-mono text-base",
              lockCpf && "bg-muted cursor-not-allowed",
              valid && !lockCpf && "border-green-500/60",
            )}
          />
          {valid && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Tipo de consulta
        </Label>
        <MethodPicker value={metodo} onChange={setMetodo} />
      </div>

      <Button
        type="submit"
        disabled={!valid || loading}
        size="lg"
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Consultando Nova Vida TI...
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" /> Consultar agora
          </>
        )}
      </Button>
    </form>
  );
}
