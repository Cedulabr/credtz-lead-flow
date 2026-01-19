import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Calendar, 
  User, 
  Filter,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  BarChart3,
  X,
  Users
} from "lucide-react";

interface User {
  id: string;
  name: string;
}

interface FiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  selectedUserId: string;
  setSelectedUserId: (value: string) => void;
  selectedMonth: string;
  setSelectedMonth: (value: string) => void;
  selectedPeriod: string;
  setSelectedPeriod: (value: string) => void;
  selectedProduct: string;
  setSelectedProduct: (value: string) => void;
  viewMode: "propostas" | "clientes" | "estatisticas";
  setViewMode: (value: "propostas" | "clientes" | "estatisticas") => void;
  users: User[];
  statusCounts: Record<string, number>;
  productCounts: Record<string, number>;
  isGestorOrAdmin: boolean;
  monthOptions: { value: string; label: string }[];
}

// Product options for filter
export const PRODUCT_OPTIONS = [
  { value: "all", label: "Todos os Produtos", icon: "📦" },
  { value: "Portabilidade", label: "Portabilidade", icon: "🔄" },
  { value: "Novo empréstimo", label: "Novo Empréstimo", icon: "💰" },
  { value: "Refinanciamento", label: "Refinanciamento", icon: "🔁" },
  { value: "Cartão", label: "Cartão", icon: "💳" }
];

// Status configuration with new workflow
export const STATUS_CONFIG = {
  // Operacionais (usuário comum)
  solicitado_digitacao: { 
    label: "📤 Digitação Solicitada", 
    shortLabel: "Solicitado",
    color: "bg-blue-500/10 text-blue-600 border-blue-300",
    userAllowed: true
  },
  proposta_digitada: { 
    label: "📝 Proposta Digitada", 
    shortLabel: "Digitada",
    color: "bg-purple-500/10 text-purple-600 border-purple-300",
    userAllowed: true
  },
  pago_aguardando: { 
    label: "💰 Pago (Aguardando Gestão)", 
    shortLabel: "Aguardando",
    color: "bg-amber-500/10 text-amber-600 border-amber-300",
    userAllowed: true
  },
  cancelado_aguardando: { 
    label: "❌ Cancelado (Aguardando Gestão)", 
    shortLabel: "Cancel. Aguard.",
    color: "bg-orange-500/10 text-orange-600 border-orange-300",
    userAllowed: true
  },
  // Gerenciais (gestor/admin only)
  pendente: { 
    label: "⚠️ Pendência de Análise", 
    shortLabel: "Pendente",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-300",
    userAllowed: false
  },
  devolvido: { 
    label: "🔄 Devolvido para Operador", 
    shortLabel: "Devolvido",
    color: "bg-sky-500/10 text-sky-600 border-sky-300",
    userAllowed: false
  },
  pago_aprovado: { 
    label: "✅ Pago Aprovado", 
    shortLabel: "Aprovado",
    color: "bg-green-500/10 text-green-600 border-green-300",
    userAllowed: false
  },
  cancelado_confirmado: { 
    label: "⛔ Cancelamento Confirmado", 
    shortLabel: "Cancelado",
    color: "bg-red-500/10 text-red-600 border-red-300",
    userAllowed: false
  }
};

const PERIOD_OPTIONS = [
  { value: "all", label: "Todos os períodos" },
  { value: "today", label: "⏱️ Hoje" },
  { value: "yesterday", label: "⏱️ Ontem" },
  { value: "3days", label: "⏱️ Últimos 3 dias" },
  { value: "7days", label: "⏱️ Últimos 7 dias" },
  { value: "month", label: "📅 Este mês" }
];

export const TelevendasFilters = ({
  searchTerm,
  setSearchTerm,
  selectedStatus,
  setSelectedStatus,
  selectedUserId,
  setSelectedUserId,
  selectedMonth,
  setSelectedMonth,
  selectedPeriod,
  setSelectedPeriod,
  selectedProduct,
  setSelectedProduct,
  viewMode,
  setViewMode,
  users,
  statusCounts,
  productCounts,
  isGestorOrAdmin,
  monthOptions
}: FiltersProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Count active filters
  const activeFiltersCount = [
    selectedStatus !== "all",
    selectedUserId !== "all",
    selectedPeriod !== "all",
    selectedProduct !== "all",
    searchTerm.length > 0
  ].filter(Boolean).length;

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedStatus("all");
    setSelectedUserId("all");
    setSelectedPeriod("all");
    setSelectedMonth("all");
    setSelectedProduct("all");
  };

  return (
    <div className="space-y-4">
      {/* Toggle Propostas / Clientes / Estatísticas */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          <Button
            variant={viewMode === "propostas" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("propostas")}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Propostas</span>
          </Button>
          <Button
            variant={viewMode === "clientes" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("clientes")}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Clientes</span>
          </Button>
          {isGestorOrAdmin && (
            <Button
              variant={viewMode === "estatisticas" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("estatisticas")}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Estatísticas</span>
            </Button>
          )}
        </div>

        {/* Quick period filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
          {PERIOD_OPTIONS.slice(0, 4).map((period) => (
            <Badge
              key={period.value}
              variant={selectedPeriod === period.value ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap flex-shrink-0 transition-all hover:scale-105"
              onClick={() => setSelectedPeriod(period.value)}
            >
              {period.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Product filter badges */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
        {PRODUCT_OPTIONS.map((product) => {
          const count = product.value === "all" 
            ? productCounts.all || 0 
            : productCounts[product.value] || 0;
          
          return (
            <Badge
              key={product.value}
              variant={selectedProduct === product.value ? "default" : "outline"}
              className={`cursor-pointer whitespace-nowrap flex-shrink-0 transition-all hover:scale-105 ${
                selectedProduct === product.value 
                  ? '' 
                  : 'bg-background hover:bg-muted'
              }`}
              onClick={() => setSelectedProduct(product.value)}
            >
              <span className="mr-1">{product.icon}</span>
              {product.label} ({count})
            </Badge>
          );
        })}
      </div>

      {/* Search + Advanced toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 text-base"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button
          variant={showAdvanced || activeFiltersCount > 0 ? "default" : "outline"}
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Filtros avançados</span>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-8 text-xs gap-1"
                  >
                    <X className="h-3 w-3" />
                    Limpar filtros
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* User filter (admin/gestor) */}
                {isGestorOrAdmin && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" /> Usuário
                    </label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Todos os usuários" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os usuários</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || 'Sem nome'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Period filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Período
                  </label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecionar período" />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_OPTIONS.map((period) => (
                        <SelectItem key={period.value} value={period.value}>
                          {period.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Month filter (when period is "month") */}
                {selectedPeriod === "month" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Mês específico</label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecionar mês" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os meses</SelectItem>
                        {monthOptions.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status filter badges - Only show when not in statistics view */}
      {viewMode !== "estatisticas" && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
          <Badge 
            variant={selectedStatus === "all" ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap flex-shrink-0 transition-all hover:scale-105"
            onClick={() => setSelectedStatus("all")}
          >
            Todos ({statusCounts.all || 0})
          </Badge>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            // Show manager-only statuses only for gestor/admin
            if (!config.userAllowed && !isGestorOrAdmin) return null;
            
            const count = statusCounts[status] || 0;
            if (count === 0 && selectedStatus !== status) return null;
            
            return (
              <Badge 
                key={status}
                variant={selectedStatus === status ? "default" : "outline"}
                className={`cursor-pointer whitespace-nowrap flex-shrink-0 transition-all hover:scale-105 ${
                  selectedStatus !== status ? config.color : ''
                }`}
                onClick={() => setSelectedStatus(status)}
              >
                {config.shortLabel} ({count})
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};
