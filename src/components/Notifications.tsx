import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  DollarSign,
  Users,
  Star,
  Clock,
  Settings,
  Trash2
} from "lucide-react";

export function Notifications() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "approval",
      title: "Cliente Aprovado! 🎉",
      message: "João Silva foi aprovado para crédito consignado de R$ 25.000",
      commission: "R$ 750",
      time: "há 2 horas",
      read: false,
      icon: CheckCircle,
      color: "success"
    },
    {
      id: 2,
      type: "new_lead",
      title: "Novo Lead Atribuído",
      message: "Maria Costa - Crédito Imobiliário R$ 120.000 em São Paulo",
      commission: "R$ 2.400",
      time: "há 4 horas",
      read: false,
      icon: TrendingUp,
      color: "primary"
    },
    {
      id: 3,
      type: "payment",
      title: "Pagamento Processado",
      message: "Comissão de R$ 380 foi transferida para sua conta via PIX",
      time: "há 1 dia",
      read: true,
      icon: DollarSign,
      color: "success"
    },
    {
      id: 4,
      type: "opportunity",
      title: "Oportunidade Premium",
      message: "Cliente pré-aprovado para crédito de R$ 50.000 - Alta conversão",
      commission: "R$ 1.500",
      time: "há 1 dia",
      read: false,
      icon: Star,
      color: "warning"
    },
    {
      id: 5,
      type: "reminder",
      title: "Lembrete: Lead Aguardando",
      message: "Ana Silva está há 2 dias sem contato. Entre em contato!",
      time: "há 2 dias",
      read: true,
      icon: Clock,
      color: "warning"
    },
    {
      id: 6,
      type: "system",
      title: "Nova Funcionalidade",
      message: "Agora você pode fazer upload de documentos diretamente no app",
      time: "há 3 dias",
      read: true,
      icon: Bell,
      color: "primary"
    },
    {
      id: 7,
      type: "referral",
      title: "Amigo Cadastrado",
      message: "Carlos Silva se cadastrou usando seu código. Ganhe bônus!",
      commission: "R$ 50",
      time: "há 1 semana",
      read: true,
      icon: Users,
      color: "success"
    }
  ]);

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const deleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const typeConfig = {
    approval: { label: "Aprovação", bgColor: "bg-success/10" },
    new_lead: { label: "Novo Lead", bgColor: "bg-primary/10" },
    payment: { label: "Pagamento", bgColor: "bg-success/10" },
    opportunity: { label: "Oportunidade", bgColor: "bg-warning/10" },
    reminder: { label: "Lembrete", bgColor: "bg-warning/10" },
    system: { label: "Sistema", bgColor: "bg-primary/10" },
    referral: { label: "Indicação", bgColor: "bg-success/10" }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Notificações
            </h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 
                ? `Você tem ${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}`
                : "Todas as notificações foram lidas"
              }
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
        </div>

        {/* Action Buttons */}
        {unreadCount > 0 && (
          <div className="flex gap-2">
            <Button 
              onClick={markAllAsRead}
              variant="outline" 
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Marcar Todas como Lidas
            </Button>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4 text-center">
            <Bell className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{notifications.length}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5">
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-6 w-6 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{unreadCount}</p>
            <p className="text-sm text-muted-foreground">Não Lidas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">
              {notifications.filter(n => n.type === "approval").length}
            </p>
            <p className="text-sm text-muted-foreground">Aprovações</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-muted/20">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">
              {notifications.filter(n => n.type === "payment").length}
            </p>
            <p className="text-sm text-muted-foreground">Pagamentos</p>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((notification) => {
          const Icon = notification.icon;
          const typeInfo = typeConfig[notification.type as keyof typeof typeConfig];
          
          return (
            <Card 
              key={notification.id} 
              className={`transition-all hover:shadow-md ${
                !notification.read 
                  ? "border-primary/30 bg-primary/5" 
                  : "hover:bg-muted/50"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${typeInfo.bgColor} flex-shrink-0`}>
                    <Icon className={`h-5 w-5 text-${notification.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className={`font-semibold text-foreground ${
                          !notification.read ? "font-bold" : ""
                        }`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        
                        {notification.commission && (
                          <div className="mt-2">
                            <Badge variant="secondary" className="text-success">
                              <DollarSign className="h-3 w-3 mr-1" />
                              {notification.commission}
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline">
                          {typeInfo.label}
                        </Badge>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">
                        {notification.time}
                      </span>

                      <div className="flex gap-2">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {notifications.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhuma notificação
            </h3>
            <p className="text-muted-foreground">
              Você receberá notificações sobre aprovações, novos leads e pagamentos aqui.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      <Card className="bg-gradient-to-r from-muted/50 to-muted/20">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3">Configurações de Notificação</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong>Aprovações:</strong> Receba notificações imediatas quando clientes forem aprovados</p>
            <p>• <strong>Novos Leads:</strong> Seja notificado sobre leads atribuídos a você</p>
            <p>• <strong>Pagamentos:</strong> Confirme o recebimento de comissões</p>
            <p>• <strong>Lembretes:</strong> Acompanhe leads que precisam de follow-up</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}