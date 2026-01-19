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
  Users,
  ClipboardCheck
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
  viewMode: "propostas" | "clientes" | "estatisticas" | "aprovacoes";
  setViewMode: (value: "propostas" | "clientes" | "estatisticas" | "aprovacoes") => void;
  users: User[];
  statusCounts: Record<string, number>;
  productCounts: Record<string, number>;
  isGestorOrAdmin: boolean;
  monthOptions: { value: string; label: string }[];
  pendingApprovals?: number;
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
  monthOptions,
  pendingApprovals = 0
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
    <div className="space-y-5">
      {/* Toggle Propostas / Clientes / Aprovações / Estatísticas - Bigger on mobile */}
      <div className="flex flex-col gap-4">
        {/* Main view toggle - scrollable on mobile */}
        <div className="flex gap-1.5 p-1.5 bg-muted rounded-xl overflow-x-auto snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
          <Button
            variant={viewMode === "propostas" ? "default" : "ghost"}
            size="lg"
            onClick={() => setViewMode("propostas")}
            className="flex-shrink-0 snap-start gap-2 h-12 sm:h-10 px-4 text-base sm:text-sm font-semibold"
          >
            <List className="h-5 w-5 sm:h-4 sm:w-4" />
            Propostas
          </Button>
          <Button
            variant={viewMode === "clientes" ? "default" : "ghost"}
            size="lg"
            onClick={() => setViewMode("clientes")}
            className="flex-shrink-0 snap-start gap-2 h-12 sm:h-10 px-4 text-base sm:text-sm font-semibold"
          >
            <Users className="h-5 w-5 sm:h-4 sm:w-4" />
            Clientes
          </Button>
          {isGestorOrAdmin && (
            <>
              <Button
                variant={viewMode === "aprovacoes" ? "default" : "ghost"}
                size="lg"
                onClick={() => setViewMode("aprovacoes")}
                className={`
                  flex-shrink-0 snap-start gap-2 h-12 sm:h-10 px-4 text-base sm:text-sm font-semibold
                  ${pendingApprovals > 0 ? 'relative' : ''}
                `}
              >
                <ClipboardCheck className="h-5 w-5 sm:h-4 sm:w-4" />
                Aprovações
                {pendingApprovals > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-destructive text-destructive-foreground text-xs font-bold items-center justify-center">
                      {pendingApprovals}
                    </span>
                  </span>
                )}
              </Button>
              <Button
                variant={viewMode === "estatisticas" ? "default" : "ghost"}
                size="lg"
                onClick={() => setViewMode("estatisticas")}
                className="flex-shrink-0 snap-start gap-2 h-12 sm:h-10 px-4 text-base sm:text-sm font-semibold"
              >
                <BarChart3 className="h-5 w-5 sm:h-4 sm:w-4" />
                Stats
              </Button>
            </>
          )}
        </div>

        {/* Quick period filters - Now scrollable on mobile with bigger touch targets */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 snap-x snap-mandatory">
          {PERIOD_OPTIONS.slice(0, 4).map((period) => (
            <Badge
              key={period.value}
              variant={selectedPeriod === period.value ? "default" : "outline"}
              className={`
                cursor-pointer whitespace-nowrap flex-shrink-0 snap-start
                py-3 px-4 text-sm sm:py-2 sm:px-3 sm:text-xs
                font-medium transition-all active:scale-95 hover:scale-105
                ${selectedPeriod === period.value 
                  ? 'shadow-md ring-2 ring-primary/20' 
                  : 'hover:bg-muted'
                }
              `}
              onClick={() => setSelectedPeriod(period.value)}
            >
              {period.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Product filter badges - Larger with clear visual hierarchy */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2 px-1">
          <LayoutGrid className="h-4 w-4 text-primary" />
          Filtrar por Produto
        </label>
        <div className="grid grid-cols-2 sm:flex gap-2 sm:overflow-x-auto sm:pb-1 sm:-mx-2 sm:px-2">
          {PRODUCT_OPTIONS.map((product) => {
            const count = product.value === "all" 
              ? productCounts.all || 0 
              : productCounts[product.value] || 0;
            const isSelected = selectedProduct === product.value;
            
            return (
              <motion.button
                key={product.value}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedProduct(product.value)}
                className={`
                  flex items-center justify-between gap-2 
                  py-3 px-4 rounded-xl border-2 
                  text-left transition-all duration-200
                  sm:py-2.5 sm:px-3 sm:flex-shrink-0
                  ${isSelected 
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25' 
                    : 'bg-card border-border hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-base">{product.icon}</span>
                  <span className="font-medium text-sm sm:text-xs truncate">{product.label}</span>
                </div>
                <Badge 
                  variant={isSelected ? "secondary" : "outline"}
                  className={`
                    text-xs font-bold min-w-[28px] justify-center
                    ${isSelected ? 'bg-primary-foreground/20 text-primary-foreground border-0' : ''}
                  `}
                >
                  {count}
                </Badge>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Search + Advanced toggle - Larger input for mobile */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 sm:pl-10 h-14 sm:h-12 text-lg sm:text-base rounded-xl border-2 focus:border-primary"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-8 sm:w-8 p-0 rounded-lg"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
          )}
        </div>
        <Button
          variant={showAdvanced || activeFiltersCount > 0 ? "default" : "outline"}
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`
            gap-2 h-14 sm:h-12 px-4 rounded-xl border-2
            ${showAdvanced || activeFiltersCount > 0 
              ? 'shadow-lg shadow-primary/25' 
              : 'hover:border-primary/50'
            }
          `}
        >
          <Filter className="h-5 w-5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline font-medium">Filtros</span>
          {activeFiltersCount > 0 && (
            <Badge 
              variant="secondary" 
              className="h-6 w-6 sm:h-5 sm:w-5 p-0 flex items-center justify-center text-xs font-bold"
            >
              {activeFiltersCount}
            </Badge>
          )}
          {showAdvanced ? <ChevronUp className="h-5 w-5 sm:h-4 sm:w-4" /> : <ChevronDown className="h-5 w-5 sm:h-4 sm:w-4" />}
        </Button>
      </div>

      {/* Advanced Filters - Better mobile layout */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 sm:p-4 bg-muted/50 rounded-2xl border-2 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-sm font-semibold text-foreground">Filtros avançados</span>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-10 sm:h-8 text-sm sm:text-xs gap-2 px-4 rounded-lg"
                  >
                    <X className="h-4 w-4 sm:h-3 sm:w-3" />
                    Limpar filtros
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* User filter (admin/gestor) */}
                {isGestorOrAdmin && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" /> Usuário
                    </label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger className="h-14 sm:h-12 text-base sm:text-sm rounded-xl border-2">
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
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> Período
                  </label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="h-14 sm:h-12 text-base sm:text-sm rounded-xl border-2">
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
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Mês específico</label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="h-14 sm:h-12 text-base sm:text-sm rounded-xl border-2">
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

      {/* Status filter badges - Larger and more prominent */}
      {viewMode !== "estatisticas" && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2 px-1">
            <Filter className="h-4 w-4 text-primary" />
            Filtrar por Status
          </label>
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible snap-x snap-mandatory">
            <Badge 
              variant={selectedStatus === "all" ? "default" : "outline"}
              className={`
                cursor-pointer whitespace-nowrap flex-shrink-0 snap-start
                py-3 px-4 text-sm sm:py-2 sm:px-3 sm:text-xs
                font-semibold transition-all active:scale-95 hover:scale-105
                ${selectedStatus === "all" 
                  ? 'shadow-md ring-2 ring-primary/20' 
                  : 'hover:bg-muted border-2'
                }
              `}
              onClick={() => setSelectedStatus("all")}
            >
              📋 Todos ({statusCounts.all || 0})
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
                  className={`
                    cursor-pointer whitespace-nowrap flex-shrink-0 snap-start
                    py-3 px-4 text-sm sm:py-2 sm:px-3 sm:text-xs
                    font-semibold transition-all active:scale-95 hover:scale-105
                    ${selectedStatus === status 
                      ? 'shadow-md ring-2 ring-primary/20' 
                      : `${config.color} border-2`
                    }
                  `}
                  onClick={() => setSelectedStatus(status)}
                >
                  {config.shortLabel} ({count})
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
