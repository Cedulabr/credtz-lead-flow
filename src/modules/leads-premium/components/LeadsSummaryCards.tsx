import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lead, STATUS_CONFIG } from "../types";
import { Users, TrendingUp, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

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
    pendentes: leads.filter(l => ["agendamento", "contato_futuro"].includes(l.status)).length,
  };

  const cards = [
    {
      title: "Total de Leads",
      value: stats.total,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Créditos",
      value: userCredits,
      icon: AlertCircle,
      color: "text-amber-600",
      bgColor: "bg-amber-100"
    },
    {
      title: "Novos",
      value: stats.novos,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Em Trabalho",
      value: stats.emAndamento,
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      title: "Fechados",
      value: stats.fechados,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <div className={`w-10 h-10 mx-auto mb-2 rounded-xl ${card.bgColor} flex items-center justify-center`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.title}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
