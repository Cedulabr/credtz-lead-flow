import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AnimatedContainer, StaggerContainer, StaggerItem } from "@/components/ui/animated-container";
import { 
  Phone, 
  Target, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  ArrowRight,
  Zap,
  DollarSign,
  Users,
  ChevronRight,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { format, startOfMonth, endOfMonth, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

interface ConsultorDashboardProps {
  onNavigate: (tab: string) => void;
}

interface TodayTask {
  id: string;
  type: "lead" | "callback" | "followup" | "sale";
  title: string;
  subtitle: string;
  time?: string;
  priority: "high" | "medium" | "low";
  action: string;
  tabId: string;
}

interface QuickStat {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  trend?: number;
}

export function ConsultorDashboard({ onNavigate }: ConsultorDashboardProps) {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);
  const [stats, setStats] = useState({
    salesToday: 0,
    salesMonth: 0,
    monthGoal: 30,
    leadsToWork: 0,
    pendingCallbacks: 0,
    commissionsPreview: 0
  });

  const userName = profile?.name?.split(" ")[0] || "Consultor";
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

      // Fetch sales today
      const { data: todaySales } = await supabase
        .from("televendas")
        .select("id")
        .eq("user_id", user?.id)
        .eq("data_venda", today);

      // Fetch sales this month
      const { data: monthSales } = await supabase
        .from("televendas")
        .select("id, status")
        .eq("user_id", user?.id)
        .gte("data_venda", monthStart)
        .lte("data_venda", monthEnd);

      // Fetch leads assigned to user
      const { data: leads } = await supabase
        .from("leads")
        .select("id, status")
        .eq("assigned_to", user?.id)
        .in("status", ["new_lead", "em_andamento"]);

      // Fetch activate leads
      const { data: activateLeads } = await supabase
        .from("activate_leads")
        .select("id, status, proxima_acao, data_proxima_operacao")
        .eq("assigned_to", user?.id)
        .in("status", ["novo", "em_andamento", "agendamento"]);

      // Fetch commissions preview
      const { data: commissions } = await supabase
        .from("commissions")
        .select("commission_amount")
        .eq("user_id", user?.id)
        .eq("status", "preview")
        .gte("proposal_date", monthStart);

      const totalCommissions = (commissions || []).reduce(
        (sum, c) => sum + Number(c.commission_amount || 0),
        0
      );

      // Build today tasks
      const tasks: TodayTask[] = [];

      // Add leads to work
      if ((leads?.length || 0) > 0) {
        tasks.push({
          id: "leads-premium",
          type: "lead",
          title: `${leads?.length} Leads Premium para trabalhar`,
          subtitle: "Clientes aguardando seu contato",
          priority: "high",
          action: "Trabalhar agora",
          tabId: "leads"
        });
      }

      // Add activate leads
      if ((activateLeads?.length || 0) > 0) {
        const todayCallbacks = activateLeads?.filter(l => {
          if (!l.data_proxima_operacao) return false;
          return isToday(parseISO(l.data_proxima_operacao));
        }) || [];

        if (todayCallbacks.length > 0) {
          tasks.push({
            id: "callbacks-today",
            type: "callback",
            title: `${todayCallbacks.length} retornos agendados para hoje`,
            subtitle: "Não deixe o cliente esperando!",
            priority: "high",
            action: "Ver agendamentos",
            tabId: "activate-leads"
          });
        }

        const newLeads = activateLeads?.filter(l => l.status === "novo") || [];
        if (newLeads.length > 0) {
          tasks.push({
            id: "activate-new",
            type: "lead",
            title: `${newLeads.length} Activate Leads novos`,
            subtitle: "Leads quentes para conversão",
            priority: "medium",
            action: "Iniciar contatos",
            tabId: "activate-leads"
          });
        }
      }

      // Suggest new sale if no tasks
      if (tasks.length === 0) {
        tasks.push({
          id: "new-sale",
          type: "sale",
          title: "Registrar nova venda",
          subtitle: "Já fechou uma venda? Registre agora!",
          priority: "low",
          action: "Nova venda",
          tabId: "televendas"
        });
      }

      setStats({
        salesToday: todaySales?.length || 0,
        salesMonth: monthSales?.length || 0,
        monthGoal: 30,
        leadsToWork: (leads?.length || 0) + (activateLeads?.filter(l => l.status === "novo")?.length || 0),
        pendingCallbacks: activateLeads?.filter(l => l.proxima_acao)?.length || 0,
        commissionsPreview: totalCommissions
      });

      setTodayTasks(tasks);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickStats: QuickStat[] = [
    {
      label: "Vendas Hoje",
      value: stats.salesToday,
      icon: CheckCircle,
      color: "text-green-600"
    },
    {
      label: "Leads p/ Trabalhar",
      value: stats.leadsToWork,
      icon: Users,
      color: "text-blue-600"
    },
    {
      label: "Retornos Pendentes",
      value: stats.pendingCallbacks,
      icon: Clock,
      color: "text-amber-600"
    }
  ];

  const progressPercentage = Math.min((stats.salesMonth / stats.monthGoal) * 100, 100);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Greeting */}
      <AnimatedContainer animation="slide-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {greeting}, {userName}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchDashboardData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </AnimatedContainer>

      {/* Quick Stats */}
      <StaggerContainer className="grid grid-cols-3 gap-3">
        {quickStats.map((stat, index) => (
          <StaggerItem key={stat.label} index={index}>
            <Card className="text-center">
              <CardContent className="p-4">
                <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Monthly Progress */}
      <AnimatedContainer animation="slide-up" delay={0.1}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Meta do Mês
              </CardTitle>
              <Badge variant={progressPercentage >= 100 ? "default" : "secondary"}>
                {stats.salesMonth} / {stats.monthGoal} vendas
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>{progressPercentage.toFixed(0)}% concluído</span>
              <span>Faltam {Math.max(0, stats.monthGoal - stats.salesMonth)} vendas</span>
            </div>
          </CardContent>
        </Card>
      </AnimatedContainer>

      {/* Commissions Preview */}
      {stats.commissionsPreview > 0 && (
        <AnimatedContainer animation="slide-up" delay={0.15}>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Comissões a Receber</p>
                    <p className="text-xl font-bold text-primary">
                      {stats.commissionsPreview.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL"
                      })}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onNavigate("commissions")}>
                  Ver detalhes
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </AnimatedContainer>
      )}

      {/* Today's Tasks */}
      <AnimatedContainer animation="slide-up" delay={0.2}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold text-lg">Suas Tarefas de Hoje</h2>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Carregando...
              </CardContent>
            </Card>
          ) : todayTasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Tudo em dia! 🎉</p>
                <p className="text-sm text-muted-foreground">Que tal registrar uma nova venda?</p>
                <Button className="mt-4" onClick={() => onNavigate("televendas")}>
                  <Phone className="h-4 w-4 mr-2" />
                  Nova Venda
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {todayTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      task.priority === "high" ? "border-l-4 border-l-destructive" :
                      task.priority === "medium" ? "border-l-4 border-l-amber-500" :
                      "border-l-4 border-l-muted"
                    }`}
                    onClick={() => onNavigate(task.tabId)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            task.type === "lead" ? "bg-blue-100 text-blue-600" :
                            task.type === "callback" ? "bg-amber-100 text-amber-600" :
                            task.type === "followup" ? "bg-purple-100 text-purple-600" :
                            "bg-green-100 text-green-600"
                          }`}>
                            {task.type === "lead" && <Users className="h-5 w-5" />}
                            {task.type === "callback" && <Clock className="h-5 w-5" />}
                            {task.type === "followup" && <Calendar className="h-5 w-5" />}
                            {task.type === "sale" && <Phone className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-muted-foreground">{task.subtitle}</p>
                          </div>
                        </div>
                        <Button size="sm">
                          {task.action}
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </AnimatedContainer>

      {/* Quick Actions */}
      <AnimatedContainer animation="slide-up" delay={0.3}>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2"
            onClick={() => onNavigate("televendas")}
          >
            <Phone className="h-6 w-6 text-primary" />
            <span>Nova Venda</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2"
            onClick={() => onNavigate("indicate")}
          >
            <TrendingUp className="h-6 w-6 text-primary" />
            <span>Indicar Cliente</span>
          </Button>
        </div>
      </AnimatedContainer>
    </div>
  );
}
