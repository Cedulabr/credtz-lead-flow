import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, LayoutGrid, LayoutList } from "lucide-react";
import { Company, ViewMode, UserFilters } from "./types";
import { CreateUser } from "@/components/CreateUser";
import { cn } from "@/lib/utils";

interface UserFiltersBarProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  companies: Company[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  resultCount: number;
}

export function UserFiltersBar({
  filters,
  onFiltersChange,
  companies,
  viewMode,
  onViewModeChange,
  resultCount,
}: UserFiltersBarProps) {
  const update = (partial: Partial<UserFilters>) =>
    onFiltersChange({ ...filters, ...partial });

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou CPF..."
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="pl-10 h-10"
          />
        </div>

        {/* View toggle + New user */}
        <div className="flex gap-2 shrink-0">
          <div className="flex border border-border rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 rounded-none",
                viewMode === "list" && "bg-muted"
              )}
              onClick={() => onViewModeChange("list")}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 rounded-none",
                viewMode === "grid" && "bg-muted"
              )}
              onClick={() => onViewModeChange("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <CreateUser />
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.companyId || "all"}
          onValueChange={(v) => update({ companyId: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-[180px] h-9 text-xs">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Empresas</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.role || "all"}
          onValueChange={(v) => update({ role: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="Função" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Funções</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="partner">Parceiro</SelectItem>
            <SelectItem value="gestor">Gestor</SelectItem>
            <SelectItem value="colaborador">Colaborador</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status || "all"}
          onValueChange={(v) => update({ status: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-[130px] h-9 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>

        {(filters.search || filters.companyId || filters.role || filters.status) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground"
            onClick={() => onFiltersChange({ search: "", companyId: "", role: "", status: "" })}
          >
            Limpar filtros
          </Button>
        )}

        <span className="flex items-center text-xs text-muted-foreground ml-auto">
          {resultCount} usuário(s)
        </span>
      </div>
    </div>
  );
}
