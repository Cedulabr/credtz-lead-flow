import { Users, PhoneCall, FileText, CheckCircle, XCircle, DollarSign, TrendingUp, Zap, FolderOpen, FileCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ReportSummary } from "./types";

interface SummaryCardsProps {
  summary: ReportSummary;
  isLoading?: boolean;
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  const cards = [
    {
      title: "Colaboradores Ativos",
      value: summary.totalActiveUsers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Leads Trabalhados",
      value: summary.totalLeadsWorked,
      icon: PhoneCall,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Leads Ativados",
      value: summary.activatedLeads,
      icon: Zap,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Propostas Criadas",
      value: summary.totalProposalsCreated,
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Propostas Pagas",
      value: summary.proposalsPaid,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Propostas Canceladas",
      value: summary.proposalsCancelled,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      title: "Valor Total Vendido",
      value: new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(summary.totalSoldValue),
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      isMonetary: true,
    },
    {
      title: "Comissões Geradas",
      value: new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(summary.totalCommissions),
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
      isMonetary: true,
    },
    {
      title: "Documentos Salvos",
      value: summary.documentsSaved,
      icon: FolderOpen,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100",
    },
    {
      title: "Propostas Geradas",
      value: summary.savedProposals,
      icon: FileCheck,
      color: "text-pink-600",
      bgColor: "bg-pink-100",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-5 gap-4 mb-6">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{card.title}</p>
              <p className="text-lg font-bold text-foreground">
                {card.value}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
