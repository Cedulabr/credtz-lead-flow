import { useState } from "react";
import { Eye, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
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
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortOrder === "asc" ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getConversionBadgeColor = (rate: number) => {
    if (rate >= 50) return "bg-green-100 text-green-800";
    if (rate >= 30) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatório por Colaborador</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Relatório por Colaborador
          <Badge variant="secondary">{data.length} colaboradores</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    className="flex items-center hover:text-foreground"
                    onClick={() => handleSort("userName")}
                  >
                    Nome
                    <SortIcon field="userName" />
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  <button
                    className="flex items-center justify-center hover:text-foreground w-full"
                    onClick={() => handleSort("totalLeads")}
                  >
                    Leads
                    <SortIcon field="totalLeads" />
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  <button
                    className="flex items-center justify-center hover:text-foreground w-full"
                    onClick={() => handleSort("proposalsCreated")}
                  >
                    Criadas
                    <SortIcon field="proposalsCreated" />
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  <button
                    className="flex items-center justify-center hover:text-foreground w-full"
                    onClick={() => handleSort("proposalsPaid")}
                  >
                    Pagas
                    <SortIcon field="proposalsPaid" />
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  <button
                    className="flex items-center justify-center hover:text-foreground w-full"
                    onClick={() => handleSort("proposalsCancelled")}
                  >
                    Canceladas
                    <SortIcon field="proposalsCancelled" />
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  <button
                    className="flex items-center justify-center hover:text-foreground w-full"
                    onClick={() => handleSort("conversionRate")}
                  >
                    Conversão
                    <SortIcon field="conversionRate" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="flex items-center justify-end hover:text-foreground w-full"
                    onClick={() => handleSort("totalSold")}
                  >
                    Valor Vendido
                    <SortIcon field="totalSold" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="flex items-center justify-end hover:text-foreground w-full"
                    onClick={() => handleSort("commissionGenerated")}
                  >
                    Comissão
                    <SortIcon field="commissionGenerated" />
                  </button>
                </TableHead>
                <TableHead className="text-center">Última Atividade</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <p className="text-muted-foreground">
                      Nenhum dado encontrado para o período selecionado
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((user) => (
                  <TableRow key={user.userId} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{user.userName}</TableCell>
                    <TableCell className="text-center">{user.totalLeads}</TableCell>
                    <TableCell className="text-center">{user.proposalsCreated}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-green-600 font-medium">
                        {user.proposalsPaid}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-red-600 font-medium">
                        {user.proposalsCancelled}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className={getConversionBadgeColor(user.conversionRate)}
                      >
                        {user.conversionRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(user.totalSold)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(user.commissionGenerated)}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
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
