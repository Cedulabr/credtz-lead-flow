import { MapPin } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UF_LIST, UF_NOMES, UF_TO_DDDS } from "../types";

interface Props {
  value: string | null;
  onChange: (uf: string | null) => void;
  error?: string | null;
}

export function EstadoField({ value, onChange, error }: Props) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        Estado <span className="text-destructive">*</span>
      </Label>
      <Select
        value={value || ""}
        onValueChange={(v) => {
          const uf = v || null;
          // ao trocar estado, atualiza ddds derivados (mas o filtro de DDD não é exposto p/ servidor)
          onChange(uf);
        }}
      >
        <SelectTrigger className="h-10 bg-background">
          <SelectValue placeholder="Selecione o estado" />
        </SelectTrigger>
        <SelectContent className="bg-popover border shadow-lg z-[100] max-h-72">
          {UF_LIST.map(uf => (
            <SelectItem key={uf} value={uf}>
              {UF_NOMES[uf] || uf} ({uf})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        A região é definida automaticamente pelo estado selecionado.
      </p>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      {value && UF_TO_DDDS[value] && (
        <p className="text-[11px] text-muted-foreground">
          DDDs incluídos: {UF_TO_DDDS[value].join(', ')}
        </p>
      )}
    </div>
  );
}
