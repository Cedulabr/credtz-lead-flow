import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { SalesRanking } from "@/components/SalesRanking";
import {
  Calendar,
  RefreshCw,
  CheckCircle,
  Users,
  FileText,
  UserPlus,
  ShoppingCart,
  Clock,
  Star,
  Zap,
} from "lucide-react";
import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

interface ConsultorDashboardProps {
  onNavigate: (tab: string) => void;
}

export function ConsultorDashboard({ onNavigate }: ConsultorDashboardProps) {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [stats, setStats] = useState({
    premiumFechados: 0,
    activateFechados: 0,
    docsAnexados: 0,
    indicados: 0,
    vendasTelevendas: 0,
    totalFaltas: 0,
    totalAtrasos: 0,
    taxaAbsenteismo: 0,
  });

  const [absenteeismList, setAbsenteeismList] = useState<{ name: string; faltas: number }[]>([]);

  const userName = profile?.name?.split(" ")[0] || "Consultor";
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";

  const monthOptions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const months = [];
    for (let y = 2025; y <= currentYear; y++) {
      const mStart = y === 2025 ? 0 : 0;
      const mEnd = y === currentYear ? currentMonth : 11;
      for (let m = mStart; m <= mEnd; m++) {
        const date = new Date(y, m, 1);
        const value = `${y}-${String(m + 1).padStart(2, "0")}`;
        const label = format(date, "MMMM yyyy", { locale: ptBR });
        months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
      }
    }
    return months.reverse();
  }, []);

  const getDateRange = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    return { startDate, endDate };
  };

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user, selectedMonth]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      const startStr = format(startDate, "yyyy-MM-dd");
      const endStr = format(endDate, "yyyy-MM-dd");

      const [
        premiumRes,
        activateRes,
        docsRes,
        indicadosRes,
        televendasRes,
        timeClockRes,
        profilesRes,
      ] = await Promise.all([
        // Premium leads fechados
        supabase.from("leads").select("id", { count: "exact", head: true })
          .eq("status", "fechado").gte("created_at", startISO).lte("created_at", endISO),
        // Activate leads fechados
        supabase.from("activate_leads").select("id", { count: "exact", head: true })
          .eq("status", "fechado").gte("created_at", startISO).lte("created_at", endISO),
        // Docs anexados
        supabase.from("client_documents").select("id", { count: "exact", head: true })
          .gte("created_at", startISO).lte("created_at", endISO),
        // Indicados
        supabase.from("client_leads").select("id", { count: "exact", head: true })
          .gte("created_at", startISO).lte("created_at", endISO),
        // Vendas televendas
        supabase.from("televendas").select("id", { count: "exact", head: true })
          .gte("data_venda", startStr).lte("data_venda", endStr),
        // Time clock entries for absenteeism
        supabase.from("time_clock").select("user_id, clock_date, clock_type")
          .eq("clock_type", "entrada")
          .gte("clock_date", startStr).lte("clock_date", endStr),
        // Active profiles
        supabase.from("profiles").select("id, name, is_active")
          .eq("is_active", true).neq("role", "admin"),
      ]);

      // Calculate absenteeism
      const activeProfiles = profilesRes.data || [];
      const clockEntries = timeClockRes.data || [];
      const workDaysInMonth = eachDayOfInterval({ start: startDate, end: endDate > new Date() ? new Date() : endDate })
        .filter(d => !isWeekend(d));
      const totalExpectedDays = workDaysInMonth.length;

      // Group clock entries by user
      const entriesByUser = new Map<string, Set<string>>();
      clockEntries.forEach(e => {
        if (!entriesByUser.has(e.user_id)) entriesByUser.set(e.user_id, new Set());
        entriesByUser.get(e.user_id)!.add(e.clock_date);
      });

      let totalFaltas = 0;
      const absData: { name: string; faltas: number }[] = [];
      activeProfiles.forEach(p => {
        const daysWorked = entriesByUser.get(p.id)?.size || 0;
        const faltas = Math.max(0, totalExpectedDays - daysWorked);
        if (faltas > 0) {
          absData.push({ name: p.name || "Colaborador", faltas });
          totalFaltas += faltas;
        }
      });
      absData.sort((a, b) => b.faltas - a.faltas);

      const taxaAbsenteismo = activeProfiles.length > 0 && totalExpectedDays > 0
        ? (totalFaltas / (activeProfiles.length * totalExpectedDays)) * 100
        : 0;

      setStats({
        premiumFechados: premiumRes.count || 0,
        activateFechados: activateRes.count || 0,
        docsAnexados: docsRes.count || 0,
        indicados: indicadosRes.count || 0,
        vendasTelevendas: televendasRes.count || 0,
        totalFaltas,
        totalAtrasos: 0,
        taxaAbsenteismo,
      });
      setAbsenteeismList(absData.slice(0, 5));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const kpiCards = [
    { label: "Premium Fechados", value: stats.premiumFechados, icon: Star, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Activate Fechados", value: stats.activateFechados, icon: Zap, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Docs Anexados", value: stats.docsAnexados, icon: FileText, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Clientes Indicados", value: stats.indicados, icon: UserPlus, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Vendas Televendas", value: stats.vendasTelevendas, icon: ShoppingCart, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Absenteísmo", value: `${stats.taxaAbsenteismo.toFixed(1)}%`, icon: Clock, color: "text-red-500", bg: "bg-red-500/10" },
  ];

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <AnimatedContainer animation="slide-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">
              {greeting}, {userName}! 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40 h-9 text-xs bg-muted/50">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchDashboardData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </AnimatedContainer>

      {/* Ranking de Vendedores */}
      <SalesRanking selectedMonth={selectedMonth} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card className={`${card.bg} border-border/50`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${card.color}`} />
                    <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                  </div>
                  <p className="text-2xl font-bold">{card.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Absenteeism Details */}
      {absenteeismList.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-500" />
              Colaboradores com mais faltas no mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {absenteeismList.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <Badge variant="destructive" className="text-xs">{item.faltas} falta{item.faltas > 1 ? 's' : ''}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Nova Venda", icon: ShoppingCart, tab: "televendas", color: "text-primary" },
          { label: "Meus Leads", icon: Users, tab: "leads", color: "text-amber-500" },
          { label: "Indicar Cliente", icon: UserPlus, tab: "indicate", color: "text-emerald-500" },
          { label: "Controle de Ponto", icon: Clock, tab: "timeclock", color: "text-indigo-500" },
        ].map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className="h-auto py-3 flex-col gap-1.5"
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
