import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Target, 
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Star
} from "lucide-react";

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user, isAdmin } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [indicatedClientsCount, setIndicatedClientsCount] = useState(0);
  const [commissionPreview, setCommissionPreview] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [availableLeads, setAvailableLeads] = useState([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, isAdmin]);

  const fetchDashboardData = async () => {
    try {
      // Buscar clientes indicados
      if (isAdmin) {
        const { data: totalIndicatedLeads } = await supabase
          .from('leads_indicados')
          .select('id', { count: 'exact' });
        setIndicatedClientsCount(totalIndicatedLeads?.length || 0);
      } else {
        const { data: userIndicatedLeads } = await supabase
          .from('leads_indicados')
          .select('id', { count: 'exact' })
          .eq('created_by', user?.id);
        setIndicatedClientsCount(userIndicatedLeads?.length || 0);
      }

      // Buscar prévia de comissão (leads indicados fechados)
      const { data: commissions } = await supabase
        .from('commissions')
        .select('commission_amount')
        .eq('user_id', user?.id)
        .eq('status', 'pending');
      
      const totalCommission = commissions?.reduce((sum, commission) => sum + commission.commission_amount, 0) || 0;
      setCommissionPreview(totalCommission);

      // Buscar atividades recentes
      const { data: activities } = await supabase
        .from('leads_indicados')
        .select('nome, created_at, status')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setRecentActivities(activities || []);

      // Buscar leads premium disponíveis
      const { data: leads } = await supabase
        .from('leads_database')
        .select('*')
        .eq('is_available', true)
        .limit(5);
      
      setAvailableLeads(leads || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const stats = [
    {
      title: "Área do Indicador",
      value: indicatedClientsCount.toString(),
      change: `${isAdmin ? 'Total no sistema' : 'Suas indicações'}`,
      icon: Users,
      color: "primary",
      description: isAdmin ? "Total de leads indicados no sistema" : "Clientes que você indicou"
    },
    {
      title: "Leads Finalizados",
      value: "8",
      change: "4 novos hoje",
      icon: CheckCircle,
      color: "success",
      description: "Propostas finalizadas este mês"
    },
    {
      title: "Prévia de Comissão",
      value: `R$ ${commissionPreview.toFixed(2)}`,
      change: "Leads indicados fechados",
      icon: DollarSign,
      color: "warning",
      description: "Comissões pendentes de pagamento"
    },
    {
      title: "Taxa de Conversão",
      value: "68%",
      change: "+5% este mês",
      icon: Target,
      color: "primary",
      description: "Índice de conversão geral"
    }
  ];

  const formatActivities = recentActivities.map((activity, index) => ({
    id: index + 1,
    type: activity.status === 'cliente_fechado' ? 'approval' : 'indication',
    message: activity.status === 'cliente_fechado' ? 
      `Cliente ${activity.nome} fechado` : 
      `Cliente ${activity.nome} indicado`,
    time: new Date(activity.created_at).toLocaleString('pt-BR'),
    icon: activity.status === 'cliente_fechado' ? CheckCircle : Users,
    color: activity.status === 'cliente_fechado' ? 'success' : 'primary'
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Top Button - Always Visible */}
      <div className="sticky top-0 z-40 bg-background border-b p-4 shadow-card">
        <Button 
          onClick={() => onNavigate("indicate")}
          className="w-full h-14 bg-primary hover:bg-primary-dark text-primary-foreground font-bold text-lg shadow-elevation"
        >
          <Users className="mr-3 h-6 w-6" />
          Indicar Cliente
        </Button>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Header */}
        <div className="text-center space-y-3 py-4">
          <h1 className="text-3xl font-bold text-foreground">
            Olá, Alessandro! 👋
          </h1>
          <p className="text-lg text-muted-foreground">
            Você tem 3 oportunidades hoje
          </p>
        </div>

        {/* Stats Cards - Large Vertical Mobile-First */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const iconColor = stat.color === 'primary' ? 'text-primary' : 
                           stat.color === 'success' ? 'text-success' : 
                           stat.color === 'warning' ? 'text-warning' : 'text-primary';
            const bgColor = stat.color === 'primary' ? 'bg-primary/10' : 
                         stat.color === 'success' ? 'bg-success/10' : 
                         stat.color === 'warning' ? 'bg-warning/10' : 'bg-primary/10';
            
            return (
              <Card key={index} className="border-2 shadow-card hover:shadow-elevation transition-all duration-200">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className={`mx-auto w-16 h-16 ${bgColor} rounded-2xl flex items-center justify-center`}>
                      <Icon className={`h-8 w-8 ${iconColor}`} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-foreground">{stat.title}</h3>
                      <p className="text-4xl font-bold text-foreground">{stat.value}</p>
                      <p className={`text-sm font-medium ${iconColor}`}>{stat.change}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{stat.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Opportunity of the Day - Large and Clear */}
        <Card className="border-2 border-primary/20 bg-gradient-primary shadow-elevation">
          <CardContent className="p-6">
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Oportunidade do Dia</h2>
                  <Badge className="bg-white/20 text-white border-white/30 mt-1">
                    Alta Prioridade
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-white">Crédito Consignado Premium</h3>
                <p className="text-white/90 text-lg">
                  Cliente pré-aprovado aguardando contato
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-4 py-4">
                <div className="text-center">
                  <DollarSign className="h-6 w-6 text-white mx-auto mb-2" />
                  <p className="text-white font-bold text-lg">R$ 890</p>
                  <p className="text-white/80 text-sm">Comissão</p>
                </div>
                <div className="text-center">
                  <Clock className="h-6 w-6 text-white mx-auto mb-2" />
                  <p className="text-white font-bold text-lg">1 dia</p>
                  <p className="text-white/80 text-sm">Prazo</p>
                </div>
                <div className="text-center">
                  <Target className="h-6 w-6 text-white mx-auto mb-2" />
                  <p className="text-white font-bold text-lg">85%</p>
                  <p className="text-white/80 text-sm">Conversão</p>
                </div>
              </div>
              
              <Button 
                onClick={() => onNavigate("leads")}
                className="w-full h-14 bg-white text-primary hover:bg-white/90 font-bold text-lg"
              >
                Aceitar Oportunidade
                <ArrowUpRight className="ml-3 h-6 w-6" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activities Section - Simplified and Clean */}
        <Card className="border-2 shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-center text-foreground">Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formatActivities.length > 0 ? formatActivities.slice(0, 4).map((activity) => {
                const Icon = activity.icon;
                const iconColor = activity.color === 'primary' ? 'text-primary' : 
                               activity.color === 'success' ? 'text-success' : 'text-primary';
                const bgColor = activity.color === 'primary' ? 'bg-primary/10' : 
                             activity.color === 'success' ? 'bg-success/10' : 'bg-primary/10';
                
                return (
                  <div key={activity.id} className="flex items-center space-x-4 p-4 border-2 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-lg">
                        {activity.message}
                      </p>
                      <p className="text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-12 space-y-3">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-lg text-muted-foreground font-medium">
                    Nenhuma atividade recente
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}