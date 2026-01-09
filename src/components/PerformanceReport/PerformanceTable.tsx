import { useState } from "react";
import { Eye, ArrowUpDown, ChevronUp, ChevronDown, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPerformance } from "./types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PerformanceTableProps {
  data: UserPerformance[];
  isLoading?: boolean;
  onViewDetails: (userId: string, userName: string) => void;
}

type SortField = keyof UserPerformance;
type SortOrder = "asc" | "desc";

export function PerformanceTable({ data, isLoading, onViewDetails }: PerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>("totalSold");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortOrder === "asc" ? (
      <ChevronUp className="h-3 w-3 ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 ml-1" />
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getConversionBadgeColor = (rate: number) => {
    if (rate >= 50) return "bg-green-100 text-green-800 border-green-200";
    if (rate >= 30) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Colaborador</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Desempenho por Colaborador
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {data.length} colaboradores
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">
                  <button
                    className="flex items-center hover:text-foreground text-xs"
                    onClick={() => handleSort("userName")}
                  >
                    Colaborador
                    <SortIcon field="userName" />
                  </button>
                </TableHead>
                
                {/* Seção de Leads */}
                <TableHead className="text-center bg-purple-50/50">
                  <button
                    className="flex items-center justify-center hover:text-foreground w-full text-xs"
                    onClick={() => handleSort("premiumLeads")}
                  >
                    <Target className="h-3 w-3 mr-1 text-purple-600" />
                    Premium
                    <SortIcon field="premiumLeads" />
                  </button>
                </TableHead>
                <TableHead className="text-center bg-yellow-50/50">
                  <button
                    className="flex items-center justify-center hover:text-foreground w-full text-xs"
                    onClick={() => handleSort("activatedLeads")}
                  >
                    <Zap className="h-3 w-3 mr-1 text-yellow-600" />
                    Ativados
                    <SortIcon field="activatedLeads" />
                  </button>
                </TableHead>

                {/* Seção de Propostas */}
                <TableHead className="text-center">
                  <button
                    className="flex items-center justify-center hover:text-foreground w-full text-xs"
                    onClick={() => handleSort("proposalsCreated")}
                  >
                    Criadas
                    <SortIcon field="proposalsCreated" />
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  <button
                    className="flex items-center justify-center hover:text-foreground w-full text-xs"
                    onClick={() => handleSort("proposalsPaid")}
                  >
                    Pagas
                    <SortIcon field="proposalsPaid" />
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  <button
                    className="flex items-center justify-center hover:text-foreground w-full text-xs"
                    onClick={() => handleSort("proposalsCancelled")}
                  >
                    Cancel.
                    <SortIcon field="proposalsCancelled" />
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  <button
                    className="flex items-center justify-center hover:text-foreground w-full text-xs"
                    onClick={() => handleSort("conversionRate")}
                  >
                    Conv.
                    <SortIcon field="conversionRate" />
                  </button>
                </TableHead>

                {/* Valores */}
                <TableHead className="text-right">
                  <button
                    className="flex items-center justify-end hover:text-foreground w-full text-xs"
                    onClick={() => handleSort("totalSold")}
                  >
                    Vendido
                    <SortIcon field="totalSold" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="flex items-center justify-end hover:text-foreground w-full text-xs"
                    onClick={() => handleSort("commissionGenerated")}
                  >
                    Comissão
                    <SortIcon field="commissionGenerated" />
                  </button>
                </TableHead>

                {/* Outros */}
                <TableHead className="text-center">
                  <button
                    className="flex items-center justify-center hover:text-foreground w-full text-xs"
                    onClick={() => handleSort("documentsSaved")}
                  >
                    Docs
                    <SortIcon field="documentsSaved" />
                  </button>
                </TableHead>
                <TableHead className="text-center text-xs">Última Ativ.</TableHead>
                <TableHead className="text-center text-xs">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-muted rounded-full">
                        <Eye className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">
                        Nenhum dado encontrado
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Ajuste os filtros para ver resultados
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((user, index) => (
                  <TableRow 
                    key={user.userId} 
                    className={`hover:bg-muted/30 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {user.userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[120px]">{user.userName}</span>
                      </div>
                    </TableCell>
                    
                    {/* Leads Premium */}
                    <TableCell className="text-center bg-purple-50/30">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold text-sm">
                        {user.premiumLeads}
                      </span>
                    </TableCell>
                    
                    {/* Leads Ativados */}
                    <TableCell className="text-center bg-yellow-50/30">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold text-sm">
                        {user.activatedLeads}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <span className="font-medium">{user.proposalsCreated}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-green-600 font-semibold">
                        {user.proposalsPaid}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-red-500 font-medium">
                        {user.proposalsCancelled}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs font-semibold ${getConversionBadgeColor(user.conversionRate)}`}
                      >
                        {user.conversionRate.toFixed(0)}%
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(user.totalSold)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium text-violet-600">
                        {formatCurrency(user.commissionGenerated)}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <span className="text-cyan-600 font-medium">
                        {user.documentsSaved}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {user.lastActivity
                        ? format(new Date(user.lastActivity), "dd/MM HH:mm", {
                            locale: ptBR,
                          })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onViewDetails(user.userId, user.userName)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
