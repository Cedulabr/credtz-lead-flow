import { useMemo } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Target,
  Clock,
  Award,
  Users,
  FileText,
  Zap,
  AlertCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface Televenda {
  id: string;
  nome: string;
  cpf: string;
  data_venda: string;
  telefone: string;
  banco: string;
  parcela: number;
  troco: number | null;
  saldo_devedor: number | null;
  tipo_operacao: string;
  observacao: string | null;
  status: string;
  created_at: string;
  company_id: string | null;
  user_id: string;
  user?: { name: string } | null;
}

interface MetricsDashboardProps {
  televendas: Televenda[];
  isGestorOrAdmin: boolean;
}

export const TelevendasMetricsDashboard = ({ 
  televendas,
  isGestorOrAdmin 
}: MetricsDashboardProps) => {
  const metrics = useMemo(() => {
    // Total de propostas
    const totalPropostas = televendas.length;
    
    // Clientes únicos
    const clientesUnicos = new Set(televendas.map(tv => tv.cpf.replace(/\D/g, ""))).size;
    
    // Aprovadas
    const aprovadas = televendas.filter(tv => 
      tv.status === "pago_aprovado" || tv.status === "pago"
    );
    
    // Valor total aprovado
    const valorTotalAprovado = aprovadas.reduce((sum, tv) => sum + (tv.parcela || 0), 0);
    
    // Taxa de conversão
    const taxaConversao = totalPropostas > 0 
      ? ((aprovadas.length / totalPropostas) * 100).toFixed(1)
      : "0";
    
    // Aguardando gestão
    const aguardandoGestao = televendas.filter(tv => 
      tv.status === "pago_aguardando" || tv.status === "cancelado_aguardando"
    ).length;
    
    // Pendentes
    const pendentes = televendas.filter(tv => tv.status === "pendente").length;
    
    // Cancelados
    const cancelados = televendas.filter(tv => 
      tv.status === "cancelado_confirmado" || tv.status === "cancelado"
    ).length;
    
    // Produto mais vendido
    const productCounts: Record<string, number> = {};
    televendas.forEach(tv => {
      if (tv.tipo_operacao) {
        productCounts[tv.tipo_operacao] = (productCounts[tv.tipo_operacao] || 0) + 1;
      }
    });
    const topProduct = Object.entries(productCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    // Banco mais usado
    const bankCounts: Record<string, number> = {};
    televendas.forEach(tv => {
      if (tv.banco) {
        bankCounts[tv.banco] = (bankCounts[tv.banco] || 0) + 1;
      }
    });
    const topBank = Object.entries(bankCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    // Ticket médio
    const ticketMedio = aprovadas.length > 0 
      ? valorTotalAprovado / aprovadas.length 
      : 0;

    return {
      totalPropostas,
      clientesUnicos,
      aprovadas: aprovadas.length,
      valorTotalAprovado,
      taxaConversao,
      aguardandoGestao,
      pendentes,
      cancelados,
      topProduct: topProduct ? { name: topProduct[0], count: topProduct[1] } : null,
      topBank: topBank ? { name: topBank[0], count: topBank[1] } : null,
      ticketMedio
    };
  }, [televendas]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const cards = [
    {
      title: "Valor Total Aprovado",
      value: formatCurrency(metrics.valorTotalAprovado),
      subtitle: `${metrics.aprovadas} propostas aprovadas`,
      icon: DollarSign,
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-green-500/10",
      textColor: "text-green-600",
      trend: null,
      show: true,
      size: "large"
    },
    {
      title: "Taxa de Conversão",
      value: `${metrics.taxaConversao}%`,
      subtitle: `${metrics.aprovadas}/${metrics.totalPropostas} propostas`,
      icon: Target,
      color: "from-blue-500 to-indigo-600",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-600",
      trend: parseFloat(metrics.taxaConversao) >= 50 ? "up" : "down",
      show: true,
      size: "large"
    },
    {
      title: "Ticket Médio",
      value: formatCurrency(metrics.ticketMedio),
      subtitle: "Por proposta aprovada",
      icon: TrendingUp,
      color: "from-purple-500 to-violet-600",
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-600",
      trend: null,
      show: true,
      size: "medium"
    },
    {
      title: "Aguardando Gestão",
      value: metrics.aguardandoGestao.toString(),
      subtitle: "Propostas para revisar",
      icon: Clock,
      color: "from-blue-500 to-indigo-600",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-600",
      trend: null,
      show: isGestorOrAdmin,
      size: "medium",
      pulse: metrics.aguardandoGestao > 0
    },
    {
      title: "Clientes Únicos",
      value: metrics.clientesUnicos.toString(),
      subtitle: `de ${metrics.totalPropostas} propostas`,
      icon: Users,
      color: "from-cyan-500 to-teal-600",
      bgColor: "bg-cyan-500/10",
      textColor: "text-cyan-600",
      trend: null,
      show: true,
      size: "small"
    },
    {
      title: "Total Propostas",
      value: metrics.totalPropostas.toString(),
      subtitle: "No período selecionado",
      icon: FileText,
      color: "from-slate-500 to-gray-600",
      bgColor: "bg-slate-500/10",
      textColor: "text-slate-600",
      trend: null,
      show: true,
      size: "small"
    },
    {
      title: "Produto Top",
      value: metrics.topProduct?.name || "N/A",
      subtitle: metrics.topProduct ? `${metrics.topProduct.count} propostas` : "",
      icon: Award,
      color: "from-pink-500 to-rose-600",
      bgColor: "bg-pink-500/10",
      textColor: "text-pink-600",
      trend: null,
      show: metrics.topProduct !== null,
      size: "small"
    },
    {
      title: "Banco Top",
      value: metrics.topBank?.name || "N/A",
      subtitle: metrics.topBank ? `${metrics.topBank.count} operações` : "",
      icon: Zap,
      color: "from-indigo-500 to-blue-600",
      bgColor: "bg-indigo-500/10",
      textColor: "text-indigo-600",
      trend: null,
      show: metrics.topBank !== null,
      size: "small"
    }
  ];

  const visibleCards = cards.filter(c => c.show);

  return (
    <div className="space-y-4">
      {/* Main Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleCards.filter(c => c.size === "large").map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`
              relative overflow-hidden p-6
              ${card.bgColor} border-2 border-border/50
              transition-all duration-300 hover:scale-[1.02] hover:shadow-xl
            `}>
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-3xl md:text-4xl font-bold ${card.textColor}`}>
                      {card.value}
                    </p>
                    {card.trend && (
                      <span className={`flex items-center text-sm font-medium ${
                        card.trend === "up" ? "text-green-500" : "text-red-500"
                      }`}>
                        {card.trend === "up" ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color}`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              
              {/* Decorative gradient */}
              <div className={`absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${card.color} opacity-10 blur-2xl`} />
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {visibleCards.filter(c => c.size === "medium").map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
          >
            <Card className={`
              relative overflow-hidden p-4
              ${card.bgColor} border border-border/50
              transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
              ${card.pulse ? 'ring-2 ring-amber-500/50' : ''}
            `}>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
                    {card.pulse && (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                </div>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color}`}>
                  <card.icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tertiary Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {visibleCards.filter(c => c.size === "small").map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.05 }}
          >
            <Card className={`
              relative overflow-hidden p-3
              ${card.bgColor} border border-border/50
              transition-all duration-300 hover:scale-[1.02]
            `}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color}`}>
                  <card.icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{card.title}</p>
                  <p className={`text-lg font-bold ${card.textColor} truncate`}>{card.value}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
