import { useState } from "react";
import { Calendar, Filter, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateFilter, ReportFilters as ReportFiltersType } from "./types";

interface ReportFiltersProps {
  filters: ReportFiltersType;
  onFiltersChange: (filters: ReportFiltersType) => void;
  users: { id: string; name: string }[];
}

const dateOptions = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last7days", label: "Últimos 7 dias" },
  { value: "last30days", label: "Últimos 30 dias" },
  { value: "thisMonth", label: "Este mês" },
  { value: "custom", label: "Personalizado" },
];

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "pendente", label: "Pendente" },
  { value: "pago", label: "Pago" },
  { value: "cancelado", label: "Cancelado" },
  { value: "proposta_digitada", label: "Proposta Digitada" },
  { value: "solicitado_digitacao", label: "Solicitado Digitação" },
];

const originOptions = [
  { value: "all", label: "Todas" },
  { value: "televendas", label: "Televendas" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "indicacao", label: "Indicação" },
  { value: "importacao", label: "Importação" },
  { value: "outros", label: "Outros" },
];

export function ReportFilters({ filters, onFiltersChange, users }: ReportFiltersProps) {
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);

  const handleDateTypeChange = (value: string) => {
    const newDateFilter: DateFilter = {
      type: value as DateFilter["type"],
      startDate: filters.dateFilter.startDate,
      endDate: filters.dateFilter.endDate,
    };

    if (value === "custom") {
      setIsCustomDateOpen(true);
    }

    onFiltersChange({ ...filters, dateFilter: newDateFilter });
  };

  const handleCustomDateChange = (range: { from?: Date; to?: Date }) => {
    onFiltersChange({
      ...filters,
      dateFilter: {
        type: "custom",
        startDate: range.from,
        endDate: range.to,
      },
    });
  };

  const getDateLabel = () => {
    if (filters.dateFilter.type === "custom" && filters.dateFilter.startDate) {
      const start = format(filters.dateFilter.startDate, "dd/MM/yyyy", { locale: ptBR });
      const end = filters.dateFilter.endDate
        ? format(filters.dateFilter.endDate, "dd/MM/yyyy", { locale: ptBR })
        : start;
      return `${start} - ${end}`;
    }
    return dateOptions.find((o) => o.value === filters.dateFilter.type)?.label || "Hoje";
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select
              value={filters.dateFilter.type}
              onValueChange={handleDateTypeChange}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                {dateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range Picker */}
          {filters.dateFilter.type === "custom" && (
            <Popover open={isCustomDateOpen} onOpenChange={setIsCustomDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  {getDateLabel()}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={{
                    from: filters.dateFilter.startDate,
                    to: filters.dateFilter.endDate,
                  }}
                  onSelect={(range) => {
                    if (range) {
                      handleCustomDateChange({ from: range.from, to: range.to });
                    }
                  }}
                  locale={ptBR}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}

          {/* User Filter */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <Select
              value={filters.userId || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  userId: value === "all" ? null : value,
                })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos os usuários" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <Select
            value={filters.proposalStatus || "all"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                proposalStatus: value === "all" ? null : value,
              })
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Origin Filter */}
          <Select
            value={filters.origin || "all"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                origin: value === "all" ? null : value,
              })
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              {originOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
