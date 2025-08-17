import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AdminCommissionEdit } from "./AdminCommissionEdit";
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  ArrowUpRight,
  Calendar,
  Filter,
  Download,
  Building2
} from "lucide-react";

export function Commissions() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [commissions, setCommissions] = useState<any[]>([]);
  const [commissionRules, setCommissionRules] = useState<any[]>([]);
  const [banksProducts, setBanksProducts] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [extractStartDate, setExtractStartDate] = useState("");
  const [extractEndDate, setExtractEndDate] = useState("");
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [isExtractDialogOpen, setIsExtractDialogOpen] = useState(false);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [isSubmittingExtract, setIsSubmittingExtract] = useState(false);

  // Calcular totais das comissões (separando valores positivos de negativos)
  const positiveCommissions = commissions.filter(c => Number(c.commission_amount) > 0);
  const negativeCommissions = commissions.filter(c => Number(c.commission_amount) < 0);
  
  const commissionTotals = {
    total: positiveCommissions.reduce((sum, c) => sum + Number(c.commission_amount), 0),
    paid: positiveCommissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.commission_amount), 0),
    pending: positiveCommissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.commission_amount), 0),
    preview: positiveCommissions.filter(c => c.status === 'preview').reduce((sum, c) => sum + Number(c.commission_amount), 0),
    approved: positiveCommissions.filter(c => c.status === 'approved').reduce((sum, c) => sum + Number(c.commission_amount), 0),
    withdrawals: Math.abs(negativeCommissions.reduce((sum, c) => sum + Number(c.commission_amount), 0))
  };

  const statusConfig = {
    preview: { 
      label: "Prévia", 
      color: "bg-muted/20 text-muted-foreground",
      icon: Clock 
    },
    pending: { 
      label: "Pendente", 
      color: "bg-warning/20 text-warning-foreground",
      icon: Clock 
    },
    approved: { 
      label: "Aprovado", 
      color: "bg-primary/20 text-primary-foreground",
      icon: CheckCircle 
    },
    paid: { 
      label: "Pago", 
      color: "bg-success/20 text-success-foreground",
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

  // Estados para tabela de comissão
  const [commissionTableData, setCommissionTableData] = useState<any[]>([]);

  // Carregar dados das comissões e bancos/produtos
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      
      try {
        // Carregar comissões do usuário
        const { data: userCommissions } = await supabase
          .from('commissions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        // Carregar bancos e produtos
        const { data: banksProductsData } = await supabase
          .from('banks_products')
          .select('*')
          .eq('is_active', true)
          .order('bank_name, product_name');

        // Carregar tabela de comissão
        const { data: commissionTableResponse } = await supabase
          .from('commission_table')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        // Carregar regras de comissão mais recentes da commission_table
        const { data: commissionRulesData } = await supabase
          .from('commission_table')
          .select('*')
          .eq('is_active', true)
          .order('updated_at', { ascending: false });

        if (userCommissions) setCommissions(userCommissions);
        if (banksProductsData) setBanksProducts(banksProductsData);
        if (commissionTableResponse) setCommissionTableData(commissionTableResponse);
        if (commissionRulesData) setCommissionRules(commissionRulesData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };

    loadData();
  }, [user?.id]);

  const handleWithdrawalRequest = async () => {
    if (!withdrawalAmount || parseFloat(withdrawalAmount.replace(/[^\d,]/g, '').replace(',', '.')) < 50) {
      toast({
        title: "Valor inválido",
        description: "O valor mínimo para saque é R$ 50,00",
        variant: "destructive",
      });
      return;
    }

    if (!pixKey) {
      toast({
        title: "Chave PIX obrigatória",
        description: "Informe sua chave PIX para o saque",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingWithdrawal(true);
    
    try {
      const amount = parseFloat(withdrawalAmount.replace(/[^\d,]/g, '').replace(',', '.'));
      
      // Atualizar comissões em preview para pending
      const previewCommissions = commissions.filter(c => c.status === 'preview');
      if (previewCommissions.length > 0) {
        const { error: updateError } = await supabase
          .from('commissions')
          .update({ status: 'pending' })
          .eq('user_id', user?.id)
          .eq('status', 'preview');
        
        if (updateError) throw updateError;
      }

      // Buscar webhook ativo para saques
      const { data: webhook } = await supabase
        .from('webhooks')
        .select('url')
        .eq('name', 'withdrawal_request')
        .eq('is_active', true)
        .single();

      // Inserir solicitação de saque na tabela commissions
      const { error: insertError } = await supabase
        .from('commissions')
        .insert({
          user_id: user?.id,
          client_name: 'Solicitação de Saque',
          product_type: 'Saque PIX',
          bank_name: 'Sistema',
          credit_value: -amount,
          commission_amount: -amount,
          commission_percentage: 0,
          status: 'pending',
          payment_method: `PIX: ${pixKey}`
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
              pix_key: pixKey,
              user_id: user?.id,
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
      setPixKey("");
      setIsWithdrawalDialogOpen(false);
      
      // Recarregar comissões
      const { data: userCommissions } = await supabase
        .from('commissions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (userCommissions) setCommissions(userCommissions);
      
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

  const handleExtractRequest = async () => {
    if (!extractStartDate || !extractEndDate) {
      toast({
        title: "Datas obrigatórias",
        description: "Selecione o período para o extrato",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingExtract(true);
    
    try {
      // Filtrar comissões no período
      const filteredCommissions = commissions.filter(c => {
        const commissionDate = new Date(c.created_at);
        const startDate = new Date(extractStartDate);
        const endDate = new Date(extractEndDate);
        return commissionDate >= startDate && commissionDate <= endDate;
      });

      // Buscar webhook ativo para extratos
      const { data: webhook } = await supabase
        .from('webhooks')
        .select('url')
        .eq('name', 'extract_request')
        .eq('is_active', true)
        .single();

      // Enviar dados para n8n
      if (webhook?.url) {
        try {
          await fetch(webhook.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'no-cors',
            body: JSON.stringify({
              type: 'extract_request',
              user_id: user?.id,
              start_date: extractStartDate,
              end_date: extractEndDate,
              commissions: filteredCommissions,
              timestamp: new Date().toISOString()
            })
          });
        } catch (webhookError) {
          console.log('Webhook enviado (modo no-cors)');
        }
      }

      toast({
        title: "Extrato solicitado! 📄",
        description: "Seu extrato será enviado em breve por email.",
      });

      setExtractStartDate("");
      setExtractEndDate("");
      setIsExtractDialogOpen(false);
      
    } catch (error) {
      console.error('Erro ao solicitar extrato:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar solicitação de extrato.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingExtract(false);
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total do Mês</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(commissionTotals.total)}
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
                  {formatCurrency(commissionTotals.paid - commissionTotals.withdrawals)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {positiveCommissions.filter(c => c.status === 'paid').length} pagamentos
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
                <p className="text-sm text-muted-foreground">Prévia de Comissão</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(commissionTotals.preview)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {positiveCommissions.filter(c => c.status === 'preview').length} propostas
                </p>
              </div>
              <div className="p-2 bg-muted/20 rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
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
                  {formatCurrency(commissionTotals.pending)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {positiveCommissions.filter(c => c.status === 'pending').length} propostas
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
                  {formatCurrency(commissionTotals.approved)}
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

      {/* Action Buttons - Moved above Commission Parameters */}
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
              <div>
                <Label htmlFor="pixKey">Chave PIX *</Label>
                <Input
                  id="pixKey"
                  type="text"
                  placeholder="Digite sua chave PIX"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  CPF, email, telefone ou chave aleatória
                </p>
              </div>
              <Button 
                onClick={handleWithdrawalRequest}
                disabled={isSubmittingWithdrawal}
                className="w-full"
              >
                {isSubmittingWithdrawal ? "Processando..." : "Solicitar Saque"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isExtractDialogOpen} onOpenChange={setIsExtractDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Baixar Extrato
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Baixar Extrato de Comissões</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="startDate">Data Inicial *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={extractStartDate}
                  onChange={(e) => setExtractStartDate(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="endDate">Data Final *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={extractEndDate}
                  onChange={(e) => setExtractEndDate(e.target.value)}
                  className="mt-2"
                />
              </div>
              <Button 
                onClick={handleExtractRequest}
                disabled={isSubmittingExtract}
                className="w-full"
              >
                {isSubmittingExtract ? "Processando..." : "Solicitar Extrato"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Seleção de Banco e Produto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Parâmetros de Comissão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="bank">Banco/Instituição</Label>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set(commissionRules.map(cr => cr.bank_name).filter(Boolean))).map(bank => (
                    <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="product">Produto</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct} disabled={!selectedBank}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {['Novo', 'Refinanciamento', 'Portabilidade', 'Refinanciamento da Portabilidade', 'Cartão de Crédito', 'Saque Complementar'].map(product => (
                    <SelectItem key={product} value={product}>
                      {product}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {selectedBank && selectedProduct && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold mb-3">Regras de Comissão Disponíveis</h4>
              <div className="space-y-2">
                {commissionRules
                  .filter(rule => rule.bank_name === selectedBank && rule.product_name === selectedProduct)
                  .map((rule) => (
                    <div key={rule.id} className="flex justify-between items-center p-3 bg-background rounded border">
                      <div>
                        <p className="font-medium">{rule.bank_name} - {rule.product_name}</p>
                        {rule.description && (
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">
                          Repasse: {rule.commission_percentage}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Mínimo: {formatCurrency(Number(rule.minimum_value))}
                        </p>
                      </div>
                    </div>
                  ))}
                {commissionRules.filter(rule => rule.bank_name === selectedBank && rule.product_name === selectedProduct).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>Nenhuma regra de comissão encontrada para esta combinação.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>



      {/* Commissions History Table */}
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
            {commissions
              .filter(item => 
                selectedPeriod === "all" || 
                new Date(item.created_at).getMonth() === new Date().getMonth()
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
                              {commission.client_name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {commission.product_type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {commission.bank_name}
                            </p>
                          </div>
                          <Badge className={status.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Valor do Crédito: </span>
                            <span className="font-medium">{formatCurrency(Number(commission.credit_value))}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Comissão: </span>
                            <span className="font-medium text-success">
                              {formatCurrency(Number(commission.commission_amount))}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Percentual: </span>
                            <span className="font-medium">
                              {commission.commission_percentage}%
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Data: </span>
                            <span className="font-medium">
                              {formatDate(commission.created_at)}
                            </span>
                          </div>
                        </div>

                        {commission.status === "paid" && commission.payment_date && (
                          <div className="mt-2 text-xs text-success">
                            💰 Pago em {formatDate(commission.payment_date)} via {commission.payment_method || 'PIX'}
                          </div>
                        )}

                        {commission.status === "approved" && (
                          <div className="mt-2 text-xs text-primary">
                            ✅ Aprovado - Pagamento em até 5 dias úteis
                          </div>
                        )}

                        {commission.status === "pending" && commission.product_type !== 'Saque PIX' && (
                          <div className="mt-2 text-xs text-warning">
                            ⏳ Aguardando aprovação da proposta
                          </div>
                        )}

                        {commission.product_type === 'Saque PIX' && commission.status === "pending" && (
                          <div className="mt-2 text-xs text-warning">
                            💳 Solicitação de saque em análise
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            
            {commissions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma comissão encontrada</p>
                <p className="text-sm">Suas comissões aparecerão aqui quando houver movimentação</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}