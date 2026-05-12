import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { PERIOD_OPTIONS } from "../types";

interface Props {
  search: string;
  onSearch: (v: string) => void;
  motivo: string;
  onMotivo: (v: string) => void;
  periodo: string;
  onPeriodo: (v: string) => void;
  motivos: string[];
}

export function FilterBar({ search, onSearch, motivo, onMotivo, periodo, onPeriodo, motivos }: Props) {
  return (
    <div className="flex flex-col md:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar por nome, CPF, banco ou produto..."
          className="pl-9"
        />
      </div>
      <Select value={motivo} onValueChange={onMotivo}>
        <SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Motivo" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os motivos</SelectItem>
          {motivos.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={periodo} onValueChange={onPeriodo}>
        <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Período" /></SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
