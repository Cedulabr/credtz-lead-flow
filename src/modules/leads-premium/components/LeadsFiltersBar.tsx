import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";
import { LeadFilters, STATUS_CONFIG } from "../types";

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
  const hasActiveFilters = filters.status !== "all" || 
    filters.convenio !== "all" || 
    filters.tag !== "all" ||
    filters.search.length > 0;

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      status: "all",
      user: "all",
      convenio: "all",
      tag: "all"
    });
  };

  return (
    <div className="space-y-3">
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
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
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
            <SelectTrigger className="w-full sm:w-[150px]">
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
    </div>
  );
}
