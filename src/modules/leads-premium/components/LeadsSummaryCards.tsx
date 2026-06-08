import { Card, CardContent } from "@/components/ui/card";
import { Lead } from "../types";
import { Users, TrendingUp, CheckCircle, Clock, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LeadsSummaryCardsProps {
  leads: Lead[];
  userCredits: number;
}

export function LeadsSummaryCards({ leads, userCredits }: LeadsSummaryCardsProps) {
  const stats = {
    total: leads.length,
    novos: leads.filter(l => l.status === "new_lead").length,
    emAndamento: leads.filter(l => ["em_andamento", "aguardando_retorno"].includes(l.status)).length,
    fechados: leads.filter(l => l.status === "cliente_fechado").length,
  };

  const cards = [
    {
      title: "Meus Leads",
      value: stats.total,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100"
    },
    {
      title: "Créditos",
      value: userCredits,
      icon: CreditCard,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-100"
    },
    {
      title: "Novos",
      value: stats.novos,
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-100"
    },
    {
      title: "Em Trabalho",
      value: stats.emAndamento,
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-100"
    },
    {
      title: "Fechados",
      value: stats.fechados,
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-100"
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className={cn(
            "relative overflow-hidden border-none shadow-sm transition-all hover:shadow-md",
            card.bgColor,
            "border border-white/50"
          )}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={cn("p-2 rounded-lg bg-white shadow-sm", card.color)}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-none mb-1">
                  {card.value}
                </p>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">
                  {card.title}
                </p>
              </div>
              <div className={cn("absolute -right-2 -bottom-2 opacity-5", card.color)}>
                <card.icon className="h-16 w-16" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
