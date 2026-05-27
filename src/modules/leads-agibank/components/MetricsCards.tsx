import { Card } from "@/components/ui/card";
import { Users, Sparkles, TrendingUp, CreditCard } from "lucide-react";
import { AgibankLead } from "../types";

interface Props {
  leads: AgibankLead[];
  creditsBalance: number;
}

export function MetricsCards({ leads, creditsBalance }: Props) {
  const total = leads.length;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const novosHoje = leads.filter(l => new Date(l.created_at) >= startOfToday).length;

  const convertidos = leads.filter(l => l.status === "cliente_fechado").length;
  const taxaConversao = total > 0 ? (convertidos / total) * 100 : 0;

  const items = [
    { label: "Total de leads", value: total.toString(), icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Novos hoje", value: novosHoje.toString(), icon: Sparkles, color: "text-emerald-600 bg-emerald-50" },
    { label: "Taxa de conversão", value: `${taxaConversao.toFixed(1)}%`, icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
    { label: "Créditos restantes", value: creditsBalance.toString(), icon: CreditCard, color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="p-4 flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-xl font-bold leading-tight">{value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
