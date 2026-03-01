import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { SalesRanking } from "@/components/SalesRanking";
import {
  RefreshCw,
  Star,
  Zap,
  Users,
  Clock,
  FileText,
  ShoppingCart,
  UserPlus,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Flame,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

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

export function ConsultorDashboard({ onNavigate }: ConsultorDashboardProps) {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({
    leadsPremiumHoje: 0,
    metaPremium: 50,
    recontatosPremium: 0,
    recontatosActivate: 0,
    recontatosClientes: 0,
    docsHoje: 0,
    metaDocs: 10,
    propostasPagasHoje: 0,
  });

  const userName = profile?.name?.split(" ")[0] || "Consultor";
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";
  const phrase = MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)];

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const selectedMonth = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  })();

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const startISO = todayStart.toISOString();
      const endISO = todayEnd.toISOString();

      const [
        premiumHojeRes,
        recontatosPremiumRes,
        recontatosActivateRes,
        recontatosClientesRes,
        docsHojeRes,
        propostasPagasRes,
      ] = await Promise.all([
        // Leads Premium trabalhados hoje (status != 'new_lead', assigned_to = user)
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", user.id)
          .neq("status", "new_lead")
          .gte("updated_at", startISO)
          .lte("updated_at", endISO),
        // Recontatos Premium pendentes
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", user.id)
          .eq("status", "contato_futuro")
          .lte("future_contact_date", todayStr),
        // Recontatos Activate pendentes
        supabase
          .from("activate_leads")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", user.id)
          .eq("status", "contato_futuro"),
        // Recontatos Meus Clientes pendentes
        supabase
          .from("propostas")
          .select("id", { count: "exact", head: true })
          .eq("created_by_id", user.id)
          .eq("status", "contato_futuro"),
        // Documentações salvas hoje
        supabase
          .from("client_documents")
          .select("id", { count: "exact", head: true })
          .eq("uploaded_by", user.id)
          .gte("created_at", startISO)
          .lte("created_at", endISO),
        // Propostas pagas hoje
        supabase
          .from("televendas")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "pago")
          .eq("data_venda", todayStr),
      ]);

      setStats({
        leadsPremiumHoje: premiumHojeRes.count || 0,
        metaPremium: 50,
        recontatosPremium: recontatosPremiumRes.count || 0,
        recontatosActivate: recontatosActivateRes.count || 0,
        recontatosClientes: recontatosClientesRes.count || 0,
        docsHoje: docsHojeRes.count || 0,
        metaDocs: 10,
        propostasPagasHoje: propostasPagasRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, todayStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const premiumPercent = Math.min((stats.leadsPremiumHoje / stats.metaPremium) * 100, 100);
  const docsPercent = Math.min((stats.docsHoje / stats.metaDocs) * 100, 100);
  const totalRecontatos = stats.recontatosPremium + stats.recontatosActivate + stats.recontatosClientes;

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-4xl mx-auto">
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

      {/* Meta Diária de Leads Premium - Hero Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className={`border-2 ${premiumPercent >= 100 ? 'border-success/40 bg-gradient-to-br from-success/10 to-success/5' : 'border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5'}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${premiumPercent >= 100 ? 'bg-success/20' : 'bg-amber-500/20'}`}>
                  {premiumPercent >= 100 ? <CheckCircle className="h-5 w-5 text-success" /> : <Target className="h-5 w-5 text-amber-500" />}
                </div>
                <div>
                  <p className="font-semibold text-sm">Meta de Leads Premium Hoje</p>
                  <p className="text-xs text-muted-foreground">Trabalhe {stats.metaPremium} leads por dia</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{stats.leadsPremiumHoje}</p>
                <p className="text-xs text-muted-foreground">/ {stats.metaPremium}</p>
              </div>
            </div>
            <Progress value={premiumPercent} className="h-3" />
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-muted-foreground">{premiumPercent.toFixed(0)}% concluído</span>
              {premiumPercent >= 100 ? (
                <Badge className="text-[10px] bg-success/20 text-success border-success/30">🎉 Meta batida!</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">Faltam {Math.max(0, stats.metaPremium - stats.leadsPremiumHoje)}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recontatos Pendentes */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className={`border ${totalRecontatos > 0 ? 'border-orange-500/30' : 'border-border/50'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Recontatos Pendentes
              {totalRecontatos > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5">{totalRecontatos}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <div
                className="text-center p-3 bg-amber-500/10 rounded-xl cursor-pointer hover:bg-amber-500/20 transition-colors"
                onClick={() => onNavigate("leads")}
              >
                <Star className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                <p className="text-xl font-bold">{stats.recontatosPremium}</p>
                <p className="text-[10px] text-muted-foreground">Premium</p>
              </div>
              <div
                className="text-center p-3 bg-cyan-500/10 rounded-xl cursor-pointer hover:bg-cyan-500/20 transition-colors"
                onClick={() => onNavigate("activate-leads")}
              >
                <Zap className="h-4 w-4 text-cyan-500 mx-auto mb-1" />
                <p className="text-xl font-bold">{stats.recontatosActivate}</p>
                <p className="text-[10px] text-muted-foreground">Activate</p>
              </div>
              <div
                className="text-center p-3 bg-indigo-500/10 rounded-xl cursor-pointer hover:bg-indigo-500/20 transition-colors"
                onClick={() => onNavigate("meus-clientes")}
              >
                <Users className="h-4 w-4 text-indigo-500 mx-auto mb-1" />
                <p className="text-xl font-bold">{stats.recontatosClientes}</p>
                <p className="text-[10px] text-muted-foreground">Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Docs + Propostas Pagas */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className={`border h-full ${docsPercent >= 100 ? 'border-success/30' : 'border-purple-500/20'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${docsPercent >= 100 ? 'bg-success/20' : 'bg-purple-500/20'}`}>
                  <FileText className={`h-4 w-4 ${docsPercent >= 100 ? 'text-success' : 'text-purple-500'}`} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Docs Hoje</span>
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-bold">{stats.docsHoje}</span>
                <span className="text-sm text-muted-foreground">/ {stats.metaDocs}</span>
              </div>
              <Progress value={docsPercent} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground mt-1">{docsPercent.toFixed(0)}% da meta</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="border border-success/20 h-full">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 bg-success/20 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4 text-success" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Pagas Hoje</span>
              </div>
              <p className="text-2xl font-bold text-success">{stats.propostasPagasHoje}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Propostas pagas hoje</p>
              {stats.propostasPagasHoje > 0 && (
                <Badge className="mt-2 text-[10px] bg-success/10 text-success border-success/30">
                  <Flame className="h-3 w-3 mr-0.5" /> Produzindo!
                </Badge>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Ranking */}
      <SalesRanking selectedMonth={selectedMonth} />

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Nova Venda", icon: ShoppingCart, tab: "televendas", color: "text-primary" },
          { label: "Meus Leads", icon: Star, tab: "leads", color: "text-amber-500" },
          { label: "Indicar", icon: UserPlus, tab: "indicate", color: "text-success" },
        ].map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className="h-auto py-3 flex-col gap-1.5 rounded-xl"
            onClick={() => onNavigate(action.tab)}
          >
            <action.icon className={`h-5 w-5 ${action.color}`} />
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
