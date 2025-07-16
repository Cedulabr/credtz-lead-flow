import { useState } from "react";
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
  const [opportunities] = useState([
    {
      id: 1,
      title: "Crédito Consignado INSS",
      location: "São Paulo - SP",
      value: "R$ 15.000",
      commission: "R$ 450",
      priority: "alta",
      deadline: "2 dias"
    },
    {
      id: 2,
      title: "Empréstimo Pessoal",
      location: "Rio de Janeiro - RJ",
      value: "R$ 8.000",
      commission: "R$ 240",
      priority: "média",
      deadline: "1 dia"
    },
    {
      id: 3,
      title: "Crédito Imobiliário",
      location: "Belo Horizonte - MG",
      value: "R$ 120.000",
      commission: "R$ 2.400",
      priority: "alta",
      deadline: "5 dias"
    }
  ]);

  const stats = [
    {
      title: "Indicações do Mês",
      value: "12",
      change: "+3 esta semana",
      icon: Users,
      color: "primary"
    },
    {
      title: "Leads Ativos",
      value: "8",
      change: "4 novos hoje",
      icon: TrendingUp,
      color: "success"
    },
    {
      title: "Comissões Pendentes",
      value: "R$ 2.840",
      change: "+R$ 450 hoje",
      icon: DollarSign,
      color: "warning"
    },
    {
      title: "Taxa de Conversão",
      value: "68%",
      change: "+5% este mês",
      icon: Target,
      color: "primary"
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: "approval",
      message: "Cliente João Silva aprovado",
      time: "há 2 horas",
      commission: "R$ 380",
      icon: CheckCircle,
      color: "success"
    },
    {
      id: 2,
      type: "new_lead",
      message: "Novo lead atribuído",
      time: "há 4 horas",
      commission: "R$ 450",
      icon: Target,
      color: "primary"
    },
    {
      id: 3,
      type: "pending",
      message: "Cliente Maria em análise",
      time: "há 1 dia",
      commission: "R$ 320",
      icon: Clock,
      color: "warning"
    }
  ];

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
            Ver Leads
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
              {recentActivities.map((activity) => {
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
                    <div className="text-right">
                      <p className="text-sm font-semibold text-success">
                        {activity.commission}
                      </p>
                    </div>
                  </div>
                );
              })}
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
              {opportunities.slice(0, 3).map((opportunity) => (
                <div key={opportunity.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{opportunity.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {opportunity.location}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-medium text-success">
                          {opportunity.commission}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            opportunity.priority === "alta" 
                              ? "border-destructive text-destructive" 
                              : "border-warning text-warning"
                          }`}
                        >
                          {opportunity.priority}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{opportunity.value}</p>
                      <p className="text-xs text-muted-foreground">{opportunity.deadline}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}