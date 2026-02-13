import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Search, Filter, X, SlidersHorizontal, Calendar, User } from "lucide-react";
import { LeadFilters, PIPELINE_STAGES, UserProfile } from "../types";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

interface LeadsFiltersBarProps {
  filters: LeadFilters & { dateFilter?: string };
  onFiltersChange: (filters: LeadFilters & { dateFilter?: string }) => void;
  availableConvenios: string[];
  availableTags: string[];
  users?: UserProfile[];
  showUserFilter?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function LeadsFiltersBar({ 
  filters, 
  onFiltersChange, 
  availableConvenios,
  availableTags,
  users = [],
  showUserFilter = false,
  isOpen: externalOpen,
  onOpenChange: externalOpenChange
}: LeadsFiltersBarProps) {
  const isMobile = useIsMobile();
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = externalOpen ?? internalOpen;
  const setIsOpen = externalOpenChange ?? setInternalOpen;

  const hasActiveFilters = filters.status !== "all" || 
    filters.convenio !== "all" || 
    filters.tag !== "all" ||
    filters.user !== "all" ||
    filters.dateFilter !== "all";

  const activeFilterCount = [
    filters.status !== "all",
    filters.convenio !== "all",
    filters.tag !== "all",
    filters.user !== "all",
    filters.dateFilter !== "all"
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      status: "all",
      user: "all",
      convenio: "all",
      tag: "all",
      dateFilter: "all"
    });
  };

  const filterContent = (
    <div className="space-y-4">
      {/* Date Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Período
        </Label>
        <Select 
          value={filters.dateFilter || "all"} 
          onValueChange={(value) => onFiltersChange({ ...filters, dateFilter: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos os períodos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os períodos</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="yesterday">Ontem</SelectItem>
            <SelectItem value="last3days">Últimos 3 dias</SelectItem>
            <SelectItem value="thisWeek">Esta semana</SelectItem>
            <SelectItem value="thisMonth">Este mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Status</Label>
        <Select 
          value={filters.status} 
          onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos os Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {Object.entries(PIPELINE_STAGES).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Convenio Filter */}
      {availableConvenios.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Convênio</Label>
          <Select 
            value={filters.convenio} 
            onValueChange={(value) => onFiltersChange({ ...filters, convenio: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos Convênios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Convênios</SelectItem>
              {availableConvenios.map((conv) => (
                <SelectItem key={conv} value={conv}>{conv}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tag Filter */}
      {availableTags.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tag</Label>
          <Select 
            value={filters.tag} 
            onValueChange={(value) => onFiltersChange({ ...filters, tag: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Tags</SelectItem>
              {availableTags.map((tag) => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* User Filter */}
      {showUserFilter && users.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Usuário
          </Label>
          <Select 
            value={filters.user} 
            onValueChange={(value) => onFiltersChange({ ...filters, user: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos Usuários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Usuários</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name || u.email || 'Sem nome'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" className="w-full" onClick={clearFilters}>
          <X className="h-4 w-4 mr-2" />
          Limpar Filtros
        </Button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10 h-10"
          />
        </div>

        {/* Filter Sheet */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <Badge 
                  className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px]"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              {filterContent}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Desktop
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CPF ou telefone..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-10"
        />
      </div>

      {/* Date Filter */}
      <Select 
        value={filters.dateFilter || "all"} 
        onValueChange={(value) => onFiltersChange({ ...filters, dateFilter: value })}
      >
        <SelectTrigger className="w-[150px]">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="yesterday">Ontem</SelectItem>
          <SelectItem value="last3days">3 dias</SelectItem>
          <SelectItem value="thisWeek">Semana</SelectItem>
          <SelectItem value="thisMonth">Mês</SelectItem>
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select 
        value={filters.status} 
        onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
      >
        <SelectTrigger className="w-[180px]">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Status</SelectItem>
          {Object.entries(PIPELINE_STAGES).map(([key, config]) => (
            <SelectItem key={key} value={key}>
              {config.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Convenio Filter */}
      {availableConvenios.length > 0 && (
        <Select 
          value={filters.convenio} 
          onValueChange={(value) => onFiltersChange({ ...filters, convenio: value })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Convênio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Convênios</SelectItem>
            {availableConvenios.map((conv) => (
              <SelectItem key={conv} value={conv}>{conv}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Tag Filter */}
      {availableTags.length > 0 && (
        <Select 
          value={filters.tag} 
          onValueChange={(value) => onFiltersChange({ ...filters, tag: value })}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Tags</SelectItem>
            {availableTags.map((tag) => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* User Filter - Desktop */}
      {showUserFilter && users.length > 0 && (
        <Select 
          value={filters.user} 
          onValueChange={(value) => onFiltersChange({ ...filters, user: value })}
        >
          <SelectTrigger className="w-[160px]">
            <User className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Usuário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Usuários</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name || u.email || 'Sem nome'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="icon" onClick={clearFilters}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}