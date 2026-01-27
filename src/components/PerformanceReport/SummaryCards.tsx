import { 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  TrendingUp, 
  FolderOpen, 
  FileCheck,
  Zap,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportSummary } from "./types";

interface SummaryCardsProps {
  summary: ReportSummary;
  isLoading?: boolean;
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-20 mb-3" />
                <div className="h-8 bg-muted rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo Principal - Cards Grandes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Colaboradores Ativos */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Colaboradores</p>
                <p className="text-3xl font-bold mt-1">{summary.totalActiveUsers}</p>
                <p className="text-blue-100 text-xs mt-1">ativos no período</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Vendido */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Total Vendido</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(summary.totalSoldValue)}</p>
                <p className="text-emerald-100 text-xs mt-1">em operações</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comissões */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-500 to-violet-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-100 text-sm font-medium">Comissões</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(summary.totalCommissions)}</p>
                <p className="text-violet-100 text-xs mt-1">geradas</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Conversão */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Conversão</p>
                <p className="text-3xl font-bold mt-1">
                  {summary.totalProposalsCreated > 0 
                    ? ((summary.proposalsPaid / summary.totalProposalsCreated) * 100).toFixed(1)
                    : 0}%
                </p>
                <p className="text-amber-100 text-xs mt-1">propostas pagas</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Target className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seções de Leads e Propostas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seção de Leads */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
              Atividades com Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Leads Premium */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-purple-200 rounded-lg">
                    <Target className="h-4 w-4 text-purple-700" />
                  </div>
                  <span className="text-xs font-medium text-purple-700">Premium</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">{summary.premiumLeadsWorked}</p>
                <p className="text-xs text-purple-600 mt-1">leads trabalhados</p>
              </div>

              {/* Activate Leads */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-yellow-200 rounded-lg">
                    <Zap className="h-4 w-4 text-yellow-700" />
                  </div>
                  <span className="text-xs font-medium text-yellow-700">Ativados</span>
                </div>
                <p className="text-2xl font-bold text-yellow-900">{summary.activatedLeadsWorked}</p>
                <p className="text-xs text-yellow-600 mt-1">leads ativados</p>
              </div>
            </div>

            {/* Total de Leads */}
            <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total de leads trabalhados</span>
              <span className="text-lg font-bold">
                {summary.premiumLeadsWorked + summary.activatedLeadsWorked}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Seção de Propostas */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              Propostas e Conversões
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {/* Propostas Criadas */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 text-center">
                <div className="p-1.5 bg-slate-200 rounded-lg w-fit mx-auto mb-2">
                  <FileText className="h-4 w-4 text-slate-700" />
                </div>
                <p className="text-xl font-bold text-slate-900">{summary.totalProposalsCreated}</p>
                <p className="text-xs text-slate-600">criadas</p>
              </div>

              {/* Propostas Pagas */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200 text-center">
                <div className="p-1.5 bg-green-200 rounded-lg w-fit mx-auto mb-2">
                  <CheckCircle className="h-4 w-4 text-green-700" />
                </div>
                <p className="text-xl font-bold text-green-900">{summary.proposalsPaid}</p>
                <p className="text-xs text-green-600">pagas</p>
              </div>

              {/* Propostas Canceladas */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-50 to-red-100 border border-red-200 text-center">
                <div className="p-1.5 bg-red-200 rounded-lg w-fit mx-auto mb-2">
                  <XCircle className="h-4 w-4 text-red-700" />
                </div>
                <p className="text-xl font-bold text-red-900">{summary.proposalsCancelled}</p>
                <p className="text-xs text-red-600">canceladas</p>
              </div>
            </div>

            {/* Documentos e Propostas Geradas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center gap-3">
                <div className="p-2 bg-cyan-200 rounded-lg">
                  <FolderOpen className="h-4 w-4 text-cyan-700" />
                </div>
                <div>
                  <p className="text-lg font-bold text-cyan-900">{summary.documentsSaved}</p>
                  <p className="text-xs text-cyan-600">documentos salvos</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-pink-50 border border-pink-200 flex items-center gap-3">
                <div className="p-2 bg-pink-200 rounded-lg">
                  <FileCheck className="h-4 w-4 text-pink-700" />
                </div>
                <div>
                  <p className="text-lg font-bold text-pink-900">{summary.savedProposals}</p>
                  <p className="text-xs text-pink-600">propostas geradas</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
