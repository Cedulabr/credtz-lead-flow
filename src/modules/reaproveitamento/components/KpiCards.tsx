import { Card } from "@/components/ui/card";
import { Flame, RotateCcw, Wallet, XCircle } from "lucide-react";
import { brl } from "../utils/avatarColor";
import type { PropostaCancelada } from "../types";

interface Props {
  propostas: PropostaCancelada[];
  reativadasHoje: number;
}

export function KpiCards({ propostas, reativadasHoje }: Props) {
  const total = propostas.length;
  const valorPotencial = propostas.reduce(
    (s, p) => s + Number(p.troco ?? p.saldo_devedor ?? 0),
    0,
  );
  const altaChance = propostas.filter((p) => (p.reativacao_score ?? 0) >= 80).length;

  const items = [
    {
      label: "Total canceladas",
      value: total.toString(),
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-500/10",
    },
    {
      label: "Reativadas hoje",
      value: reativadasHoje.toString(),
      icon: RotateCcw,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Valor potencial",
      value: brl(valorPotencial),
      icon: Wallet,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
    },
    {
      label: "Alta chance de retorno",
      value: altaChance.toString(),
      icon: Flame,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it) => (
        <Card key={it.label} className="p-4 flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${it.bg}`}>
            <it.icon className={`h-5 w-5 ${it.color}`} />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground truncate">{it.label}</div>
            <div className="text-xl font-bold truncate">{it.value}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
