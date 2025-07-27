import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  ArrowUpRight,
  Calendar,
  Filter,
  Download,
  Edit3
} from "lucide-react";

export function Commissions() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [commissionRules, setCommissionRules] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

  const commissionData = {
    current: {
      total: 2840,
      paid: 1920,
      pending: 920,
      thisMonth: 2840
    },
    history: [
      {
        id: 1,
        clientName: "Carlos Oliveira",
        creditType: "Crédito Consignado",
        value: "R$ 25.000",
        commission: 750,
        status: "paid",
        paidAt: "2024-01-10",
        createdAt: "2024-01-05"
      },
      {
        id: 2,
        clientName: "Maria Silva",
        creditType: "Crédito Consignado INSS",
        value: "R$ 15.000",
        commission: 450,
        status: "pending",
        createdAt: "2024-01-15"
      },
      {
        id: 3,
        clientName: "Ana Costa",
        creditType: "Crédito Imobiliário",
        value: "R$ 120.000",
        commission: 2400,
        status: "approved",
        approvedAt: "2024-01-13",
        createdAt: "2024-01-08"
      },
      {
        id: 4,
        clientName: "João Santos",
        creditType: "Empréstimo Pessoal",
        value: "R$ 8.000",
        commission: 240,
        status: "pending",
        createdAt: "2024-01-14"
      },
      {
        id: 5,
        clientName: "Roberto Lima",
        creditType: "Crédito Consignado",
        value: "R$ 18.000",
        commission: 540,
        status: "paid",
        paidAt: "2023-12-28",
        createdAt: "2023-12-20"
      },
      {
        id: 6,
        clientName: "Sandra Costa",
        creditType: "Empréstimo Pessoal",
        value: "R$ 12.000",
        commission: 360,
        status: "paid",
        paidAt: "2023-12-25",
        createdAt: "2023-12-18"
      }
    ]
  };

  const statusConfig = {
    pending: { 
      label: "Pendente", 
      color: "bg-yellow-100 text-yellow-800",
      icon: Clock 
    },
    approved: { 
      label: "Aprovado", 
      color: "bg-blue-100 text-blue-800",
      icon: CheckCircle 
    },
    paid: { 
      label: "Pago", 
      color: "bg-green-100 text-green-800",
      icon: CheckCircle 
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  // Carregar regras de comissão e avisos
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: rules } = await supabase
          .from('commission_rules')
          .select('*')
          .eq('is_active', true);
        
        const { data: notifications } = await supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (rules) setCommissionRules(rules);
        if (notifications) setAnnouncements(notifications);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };

    loadData();
  }, []);

  const handleWithdrawalRequest = async () => {
    if (!withdrawalAmount || parseFloat(withdrawalAmount.replace(/[^\d,]/g, '').replace(',', '.')) < 50) {
      toast({
        title: "Valor inválido",
        description: "O valor mínimo para saque é R$ 50,00",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingWithdrawal(true);
    
    try {
      const amount = parseFloat(withdrawalAmount.replace(/[^\d,]/g, '').replace(',', '.'));
      
      // Buscar webhook ativo para saques
      const { data: webhook } = await supabase
        .from('webhooks')
        .select('url')
        .eq('name', 'withdrawal_request')
        .eq('is_active', true)
        .single();

      // Inserir solicitação de saque
      const { error: insertError } = await supabase
        .from('withdrawal_requests')
        .insert({
          amount,
          status: 'pending'
        });

      if (insertError) throw insertError;

      // Enviar webhook se configurado
      if (webhook?.url) {
        try {
          await fetch(webhook.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'no-cors',
            body: JSON.stringify({
              type: 'withdrawal_request',
              amount,
              timestamp: new Date().toISOString()
            })
          });
        } catch (webhookError) {
          console.log('Webhook enviado (modo no-cors)');
        }
      }

      toast({
        title: "Solicitação enviada! 🎉",
        description: "Sua solicitação de saque foi enviada para análise.",
      });

      setWithdrawalAmount("");
      setIsWithdrawalDialogOpen(false);
    } catch (error) {
      console.error('Erro ao solicitar saque:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar solicitação de saque.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const formatCurrencyInput = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const numberValue = parseInt(numericValue) / 100;
    return numberValue.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Minhas Comissões
          </h1>
          <p className="text-muted-foreground">
            Acompanhe seus ganhos e histórico de pagamentos
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total do Mês</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(commissionData.current.thisMonth)}
                </p>
                <p className="text-xs text-success flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +15% vs mês anterior
                </p>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Já Recebido</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(commissionData.current.paid)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  3 pagamentos
                </p>
              </div>
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(commissionData.current.pending)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  2 propostas
                </p>
              </div>
              <div className="p-2 bg-warning/10 rounded-lg">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-muted/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Próximo Pagamento</p>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(750)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Em 3 dias úteis
                </p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">📢 Avisos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {announcements.slice(0, 2).map((announcement) => (
                <div key={announcement.id} className="bg-card/50 p-3 rounded-lg">
                  <h4 className="font-medium text-foreground">{announcement.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{announcement.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDate(announcement.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Dialog open={isWithdrawalDialogOpen} onOpenChange={setIsWithdrawalDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex-1 bg-gradient-to-r from-primary to-success hover:from-primary-dark hover:to-success">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Solicitar Saque via PIX
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Saque via PIX</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Valor do Saque *</Label>
                <Input
                  id="amount"
                  type="text"
                  placeholder="R$ 0,00"
                  value={withdrawalAmount}
                  onChange={(e) => {
                    const formatted = formatCurrencyInput(e.target.value);
                    setWithdrawalAmount(formatted);
                  }}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Valor mínimo: R$ 50,00
                </p>
              </div>
              <Button 
                onClick={handleWithdrawalRequest}
                disabled={isSubmittingWithdrawal}
                className="w-full"
              >
                {isSubmittingWithdrawal ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </div>
                ) : (
                  "Solicitar Saque"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <Button variant="outline" className="flex-1">
          <Download className="mr-2 h-4 w-4" />
          Baixar Extrato
        </Button>
      </div>

      {/* Commissions History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Comissões</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={selectedPeriod === "current" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod("current")}
              >
                Este Mês
              </Button>
              <Button
                variant={selectedPeriod === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod("all")}
              >
                Todos
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commissionData.history
              .filter(item => 
                selectedPeriod === "all" || 
                new Date(item.createdAt).getMonth() === new Date().getMonth()
              )
              .map((commission) => {
                const status = statusConfig[commission.status as keyof typeof statusConfig];
                const StatusIcon = status.icon;
                
                return (
                  <div key={commission.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-foreground">
                              {commission.clientName}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {commission.creditType}
                            </p>
                          </div>
                          <Badge className={status.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Valor do Crédito: </span>
                            <span className="font-medium">{commission.value}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Comissão: </span>
                            <span className="font-medium text-success">
                              {formatCurrency(commission.commission)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Data: </span>
                            <span className="font-medium">
                              {formatDate(commission.createdAt)}
                            </span>
                          </div>
                        </div>

                        {commission.status === "paid" && commission.paidAt && (
                          <div className="mt-2 text-xs text-success">
                            💰 Pago em {formatDate(commission.paidAt)}
                          </div>
                        )}

                        {commission.status === "approved" && commission.approvedAt && (
                          <div className="mt-2 text-xs text-primary">
                            ✅ Aprovado em {formatDate(commission.approvedAt)} - Pagamento em até 5 dias úteis
                          </div>
                        )}

                        {commission.status === "pending" && (
                          <div className="mt-2 text-xs text-warning">
                            ⏳ Aguardando aprovação da proposta
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Commission Info */}
      <Card className="bg-gradient-to-r from-muted/50 to-muted/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Como funcionam as comissões?</h3>
            <Edit3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            {commissionRules.length > 0 ? (
              commissionRules.map((rule) => (
                <p key={rule.id}>
                  • <strong>{rule.product_name}:</strong> {rule.commission_percentage}% sobre o valor aprovado
                  {rule.description && (
                    <span className="block ml-4 text-xs opacity-75">{rule.description}</span>
                  )}
                </p>
              ))
            ) : (
              <>
                <p>• <strong>Crédito Consignado:</strong> 3% sobre o valor aprovado</p>
                <p>• <strong>Empréstimo Pessoal:</strong> 3% sobre o valor aprovado</p>
                <p>• <strong>Crédito Imobiliário:</strong> 2% sobre o valor aprovado</p>
              </>
            )}
            <p className="mt-3 pt-2 border-t border-border">
              • <strong>Pagamento:</strong> Até 5 dias úteis após aprovação
            </p>
            <p>• <strong>Saque mínimo:</strong> R$ 50,00 via PIX</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}