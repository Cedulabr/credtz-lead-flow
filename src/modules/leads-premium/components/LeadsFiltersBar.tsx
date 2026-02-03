import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, SlidersHorizontal } from "lucide-react";
import { LeadFilters, PIPELINE_STAGES } from "../types";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

interface LeadsFiltersBarProps {
  filters: LeadFilters;
  onFiltersChange: (filters: LeadFilters) => void;
  availableConvenios: string[];
  availableTags: string[];
}

export function LeadsFiltersBar({ 
  filters, 
  onFiltersChange, 
  availableConvenios,
  availableTags 
}: LeadsFiltersBarProps) {
  const isMobile = useIsMobile();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const hasActiveFilters = filters.status !== "all" || 
    filters.convenio !== "all" || 
    filters.tag !== "all";

  const activeFilterCount = [
    filters.status !== "all",
    filters.convenio !== "all",
    filters.tag !== "all"
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      status: "all",
      user: "all",
      convenio: "all",
      tag: "all"
    });
  };

  const filterContent = (
    <div className="space-y-4">
      {/* Status Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
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
          <label className="text-sm font-medium">Convênio</label>
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
          <label className="text-sm font-medium">Tag</label>
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
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
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

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="icon" onClick={clearFilters}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
