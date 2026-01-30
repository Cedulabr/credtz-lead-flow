import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Filter, 
  X, 
  Calendar, 
  User as UserIcon, 
  Search,
  Package,
  CheckCircle,
  CalendarDays,
  Building2
} from "lucide-react";
import { 
  User, 
  TelevendasFilters, 
  PRODUCT_OPTIONS, 
  PERIOD_OPTIONS,
  STATUS_CONFIG,
  OPERATOR_STATUSES,
  ALL_STATUSES
} from "../types";

interface FiltersDrawerProps {
  filters: TelevendasFilters;
  onFiltersChange: (filters: TelevendasFilters) => void;
  users: User[];
  isGestorOrAdmin: boolean;
  activeCount: number;
  availableBanks?: string[];
}

export const FiltersDrawer = ({
  filters,
  onFiltersChange,
  users,
  isGestorOrAdmin,
  activeCount,
  availableBanks = [],
}: FiltersDrawerProps) => {
  const updateFilter = <K extends keyof TelevendasFilters>(
    key: K,
    value: TelevendasFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      status: "all",
      userId: "all",
      period: "all",
      month: "all",
      product: "all",
      bank: "all",
    });
  };

  // Get available statuses based on role
  const availableStatuses = useMemo(() => {
    const statusList = isGestorOrAdmin ? ALL_STATUSES : OPERATOR_STATUSES;
    return statusList
      .filter((key) => STATUS_CONFIG[key])
      .map((key) => ({ 
        value: key, 
        ...STATUS_CONFIG[key] 
      }));
  }, [isGestorOrAdmin]);

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const months = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return months;
  }, []);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant={activeCount > 0 ? "default" : "outline"}
          className="gap-2 h-12 px-4 rounded-xl"
        >
          <Filter className="h-5 w-5" />
          <span className="hidden sm:inline">Filtros</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Filter className="h-5 w-5 text-primary" />
            Filtros
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Search className="h-4 w-4 text-primary" />
              Buscar Cliente
            </Label>
            <Input
              placeholder="Nome ou CPF..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="h-12 text-base rounded-xl"
            />
          </div>

          {/* Period */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Calendar className="h-4 w-4 text-primary" />
              Período Rápido
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {PERIOD_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={filters.period === option.value && filters.month === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    onFiltersChange({ ...filters, period: option.value, month: "all" });
                  }}
                  className="h-10 text-sm"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Month Filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <CalendarDays className="h-4 w-4 text-primary" />
              Mês Específico
            </Label>
            <Select
              value={filters.month}
              onValueChange={(value) => {
                onFiltersChange({ 
                  ...filters, 
                  month: value, 
                  period: value !== "all" ? "all" : filters.period 
                });
              }}
            >
              <SelectTrigger className="h-12 text-base rounded-xl">
                <SelectValue placeholder="Selecionar mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    📅 {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Package className="h-4 w-4 text-primary" />
              Produto
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {PRODUCT_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={filters.product === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("product", option.value)}
                  className="h-10 text-sm gap-1.5 justify-start"
                >
                  <span>{option.icon}</span>
                  <span className="truncate">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Bank Filter */}
          {availableBanks.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Building2 className="h-4 w-4 text-primary" />
                Banco
              </Label>
              <Select
                value={filters.bank}
                onValueChange={(value) => updateFilter("bank", value)}
              >
                <SelectTrigger className="h-12 text-base rounded-xl">
                  <SelectValue placeholder="Todos os bancos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os bancos</SelectItem>
                  {availableBanks.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      🏦 {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <CheckCircle className="h-4 w-4 text-primary" />
              Status
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={filters.status === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => updateFilter("status", "all")}
                className="h-10 text-sm"
              >
                Todos
              </Button>
              {availableStatuses.map((status) => (
                <Button
                  key={status.value}
                  variant={filters.status === status.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("status", status.value)}
                  className="h-10 text-sm gap-1.5 justify-start"
                >
                  <span>{status.emoji}</span>
                  <span className="truncate">{status.shortLabel}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* User filter (gestor/admin only) */}
          {isGestorOrAdmin && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <UserIcon className="h-4 w-4 text-primary" />
                Usuário
              </Label>
              <Select
                value={filters.userId}
                onValueChange={(value) => updateFilter("userId", value)}
              >
                <SelectTrigger className="h-12 text-base rounded-xl">
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || "Sem nome"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <SheetFooter className="mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={clearFilters}
            className="w-full h-12 text-base gap-2"
            disabled={activeCount === 0}
          >
            <X className="h-4 w-4" />
            Limpar Filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
