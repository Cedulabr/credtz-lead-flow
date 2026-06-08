import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { SalesRanking } from "@/components/SalesRanking";
import {
  RefreshCw,
  Star,
  Zap,
  ShoppingCart,
  UserPlus,
  FileText,
  MessageSquare,
  Radar,
  Wifi,
  WifiOff,
  Loader2,
  Send,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface ConsultorDashboardProps {
  onNavigate: (tab: string) => void;
}

const MOTIVATIONAL_PHRASES = [
  "Cada lead é uma oportunidade! 🚀",
  "Foco no resultado, o sucesso vem! 💪",
  "Você está mais perto da meta! 🎯",
  "Bora bater essa meta hoje! 🔥",
  "Consistência gera resultados! ⭐",
];

interface DashboardStats {
  leadsPremium: number;
  radarCredits: number;
  leadsAtivados: number;
  vendasTelevendas: number;
  documentosSalvos: number;
  whatsappConnected: boolean;
  smsCredits: number;
}

export function ConsultorDashboard({ onNavigate }: ConsultorDashboardProps) {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [checkingWhatsApp, setCheckingWhatsApp] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    leadsPremium: 0,
    radarCredits: 0,
    leadsAtivados: 0,
    vendasTelevendas: 0,
    documentosSalvos: 0,
    whatsappConnected: false,
    smsCredits: 0,
  });

  const userName = profile?.name?.split(" ")[0] || "Consultor";
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";
  const phrase = MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

  const selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const [
        leadsPremiumRes,
        leadsAtivadosRes,
        vendasRes,
        docsRes,
        radarRes,
        smsRes,
        whatsappRes,
      ] = await Promise.all([
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", user.id)
          .neq("status", "new_lead")
          .gte("updated_at", monthStart)
          .lte("updated_at", monthEnd),
        supabase
          .from("activate_leads")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", user.id),
        supabase
          .from("televendas")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "pago")
          .gte("data_venda", monthStart.slice(0, 10))
          .lte("data_venda", monthEnd.slice(0, 10)),
        supabase
          .from("client_documents")
          .select("id", { count: "exact", head: true })
          .eq("uploaded_by", user.id),
        Promise.resolve({ data: { credits_balance: 0 } as any }),
        supabase
          .from("sms_credits")
          .select("credits_balance")
          .eq("user_id", user.id)
          .maybeSingle(),
        (supabase as any)
          .from("whatsapp_instances")
          .select("id, api_token")
          .eq("user_id", user.id)
          .not("api_token", "is", null)
          .limit(1),
      ]);

      setStats({
        leadsPremium: leadsPremiumRes.count || 0,
        leadsAtivados: leadsAtivadosRes.count || 0,
        vendasTelevendas: vendasRes.count || 0,
        documentosSalvos: docsRes.count || 0,
        radarCredits: radarRes.data?.credits_balance || 0,
        smsCredits: smsRes.data?.credits_balance || 0,
        whatsappConnected: (whatsappRes.data?.length || 0) > 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const checkWhatsAppConnection = async () => {
    setCheckingWhatsApp(true);
    try {
      const { data } = await (supabase as any)
        .from("whatsapp_instances")
        .select("id, api_token")
        .eq("user_id", user?.id)
        .not("api_token", "is", null)
        .limit(1);

      const connected = (data?.length || 0) > 0;
      setStats(prev => ({ ...prev, whatsappConnected: connected }));
      toast[connected ? "success" : "warning"](
        connected ? "WhatsApp conectado!" : "WhatsApp desconectado"
      );
    } catch {
      toast.error("Erro ao verificar conexão");
    } finally {
      setCheckingWhatsApp(false);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
    }),
  };

  const cards = [
    {
      title: "Leads Premium",
      value: stats.leadsPremium,
      description: "Leads trabalhados este mês",
      icon: Star,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      borderColor: "border-amber-500 shadow-amber-500/10",
      tab: "leads",
    },
    {
      title: "Radar de Oportunidades",
      value: stats.radarCredits,
      description: "Créditos para buscas",
      icon: Radar,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      borderColor: "border-blue-500 shadow-blue-500/10",
      tab: "radar",
    },
    {
      title: "Leads Ativados",
      value: stats.leadsAtivados,
      description: "Leads ativos disponíveis",
      icon: Zap,
      iconColor: "text-cyan-600",
      iconBg: "bg-cyan-100 dark:bg-cyan-900/40",
      borderColor: "border-cyan-500 shadow-cyan-500/10",
      tab: "activate-leads",
    },
    {
      title: "Vendas Televendas",
      value: stats.vendasTelevendas,
      description: "Vendas pagas este mês",
      icon: ShoppingCart,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
      borderColor: "border-emerald-500 shadow-emerald-500/10",
      tab: "televendas-manage",
    },
    {
      title: "Documentos Salvos",
      value: stats.documentosSalvos,
      description: "Documentações armazenadas",
      icon: FileText,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
      borderColor: "border-purple-500 shadow-purple-500/10",
      tab: "documents",
    },
  ];

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-5xl mx-auto">
      {/* Greeting */}
      <AnimatedContainer animation="slide-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">
              {greeting}, {userName}! 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })} — {phrase}
            </p>
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </AnimatedContainer>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <Card
              className={cn(
                "border-2 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.03] h-full group",
                card.borderColor
              )}
              onClick={() => onNavigate(card.tab)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:rotate-12",
                    card.iconBg
                  )}>
                    <card.icon className={cn("h-6 w-6", card.iconColor)} />
                  </div>
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                      <TrendingUp className="h-3 w-3" />
                      +12%
                    </div>
                  )}
                </div>
                <p className="text-3xl font-extrabold tabular-nums tracking-tight">
                  {isLoading ? "—" : card.value.toLocaleString("pt-BR")}
                </p>
                <h3 className="text-base font-bold mt-1 tracking-tight">{card.title}</h3>
                <p className="text-xs text-muted-foreground font-medium mt-1 leading-relaxed">{card.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {/* WhatsApp API Card */}
        <motion.div custom={5} initial="hidden" animate="visible" variants={cardVariants}>
          <Card
            className={`border cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] h-full ${
              stats.whatsappConnected ? "border-green-500/20" : "border-destructive/20"
            }`}
            onClick={() => onNavigate("whatsapp")}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  stats.whatsappConnected ? "bg-green-500/15" : "bg-destructive/15"
                }`}>
                  {stats.whatsappConnected ? (
                    <Wifi className="h-5 w-5 text-green-500" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-destructive" />
                  )}
                </div>
                {isLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-2 mb-0.5">
                <Badge
                  variant={stats.whatsappConnected ? "default" : "destructive"}
                  className={`text-xs ${
                    stats.whatsappConnected
                      ? "bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/20"
                      : ""
                  }`}
                >
                  {stats.whatsappConnected ? "● Conectado" : "● Desconectado"}
                </Badge>
              </div>
              <p className="text-sm font-medium mt-1">API WhatsApp</p>
              <p className="text-xs text-muted-foreground">Status da conexão</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full text-xs bg-green-600 hover:bg-green-700 text-white border-green-600"
                onClick={(e) => {
                  e.stopPropagation();
                  checkWhatsAppConnection();
                }}
                disabled={checkingWhatsApp}
              >
                {checkingWhatsApp ? (
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                ) : (
                  <Send className="h-3 w-3 mr-1.5" />
                )}
                Verificar Conexão
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* SMS Credits Card */}
        <motion.div custom={6} initial="hidden" animate="visible" variants={cardVariants}>
          <Card
            className="border border-indigo-500/20 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] h-full sm:col-span-2 lg:col-span-3"
            onClick={() => onNavigate("sms")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-indigo-500/15 shrink-0">
                  <MessageSquare className="h-6 w-6 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Crédito SMS</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl md:text-3xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                      {isLoading ? "—" : stats.smsCredits.toLocaleString("pt-BR")}
                    </p>
                    <span className="text-xs text-muted-foreground">créditos disponíveis para envio</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 text-xs">
                  Ir para SMS
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Ranking */}
      <SalesRanking selectedMonth={selectedMonth} />

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Nova Venda", icon: ShoppingCart, tab: "televendas", color: "text-primary", bg: "bg-primary/10" },
          { label: "Meus Leads", icon: Star, tab: "leads", color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Indicar", icon: UserPlus, tab: "indicate", color: "text-emerald-500", bg: "bg-emerald-500/10" },
        ].map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className="h-auto py-4 flex-col gap-2 rounded-2xl border-2 transition-all hover:border-primary/50 hover:bg-muted/50"
            onClick={() => onNavigate(action.tab)}
          >
            <div className={cn("p-2 rounded-xl mb-1", action.bg)}>
              <action.icon className={cn("h-6 w-6", action.color)} />
            </div>
            <span className="text-[13px] font-bold tracking-tight">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
