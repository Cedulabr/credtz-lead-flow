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
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Olá, Alessandro! 👋
          </h1>
          <p className="text-muted-foreground">
            Você tem 3 oportunidades esperando por você hoje
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => onNavigate("indicate")}
            className="flex-1 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary"
          >
            <Users className="mr-2 h-4 w-4" />
            Indicar Cliente
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onNavigate("leads")}
            className="flex-1"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Leads Premium
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="bg-gradient-to-br from-card to-muted/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                    <p className={`text-xs mt-1 text-${stat.color}`}>{stat.change}</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">{stat.description}</p>
                  </div>
                  <div className={`p-2 bg-${stat.color}/10 rounded-lg`}>
                    <Icon className={`h-5 w-5 text-${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Opportunity of the Day */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-success/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Oportunidade do Dia
            </CardTitle>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Alta Prioridade
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Crédito Consignado Premium</h3>
              <p className="text-muted-foreground">
                Cliente pré-aprovado aguardando contato - Taxa especial
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-success" />
                <span>Comissão: R$ 890</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-warning" />
                <span>Prazo: 1 dia</span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4 text-primary" />
                <span>Conversão: 85%</span>
              </div>
            </div>
            <Button 
              onClick={() => onNavigate("leads")}
              className="w-full bg-gradient-to-r from-primary to-success hover:from-primary-dark hover:to-success"
            >
              Aceitar Oportunidade
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities & Available Opportunities */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formatActivities.length > 0 ? formatActivities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-center space-x-3">
                    <div className={`p-2 bg-${activity.color}/10 rounded-lg`}>
                      <Icon className={`h-4 w-4 text-${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {activity.message}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                );
              }) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma atividade recente
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Available Opportunities */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Oportunidades Disponíveis</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onNavigate("leads")}
              >
                Ver Todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableLeads.length > 0 ? availableLeads.slice(0, 3).map((lead) => (
                <div key={lead.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{lead.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {lead.convenio} - {lead.banco}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-medium text-success">
                          Telefone: {lead.phone}
                        </span>
                        <Badge variant="outline" className="text-xs border-primary text-primary">
                          Disponível
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">CPF: {lead.cpf}</p>
                      <p className="text-xs text-muted-foreground">{lead.tipo_beneficio}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum lead premium disponível
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}