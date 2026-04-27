import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Lock } from "lucide-react";
import { formatCpf, isValidCpf, onlyDigits } from "../utils/cpfMask";
import { METODOS, type Metodo } from "../utils/methodConfig";

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
  const helper = METODOS.find((m) => m.value === metodo)?.helper;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid || loading) return;
        onSubmit(onlyDigits(cpf), metodo);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cpf" className="flex items-center gap-1.5">
            CPF {lockCpf && <Lock className="h-3 w-3 text-muted-foreground" />}
          </Label>
          <Input
            id="cpf"
            inputMode="numeric"
            placeholder="___.___.___-__"
            value={cpf}
            onChange={(e) => !lockCpf && setCpf(formatCpf(e.target.value))}
            maxLength={14}
            autoFocus={!lockCpf}
            readOnly={lockCpf}
            className={lockCpf ? "bg-muted cursor-not-allowed" : undefined}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Método</Label>
          <Select value={metodo} onValueChange={(v) => setMetodo(v as Metodo)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METODOS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  <span className="mr-2">{m.icon}</span>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{helper}</p>
      <Button
        type="submit"
        disabled={!valid || loading}
        className="w-full sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Consultando...
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" /> Consultar
          </>
        )}
      </Button>
    </form>
  );
}
