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
  Building2,
  Plus
} from "lucide-react";

interface CommissionFormData {
  client_name: string;
  credit_value: string;
  commission_percentage: string;
  bank_name: string;
  product_type: string;
  proposal_date: string;
  payment_method: string;
}

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
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState<CommissionFormData>({
    client_name: '',
    credit_value: '',
    commission_percentage: '',
    bank_name: '',
    product_type: '',
    proposal_date: '',
    payment_method: ''
  });

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
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
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

      toast({
        title: "Solicitação enviada! 🎉",
        description: "Sua solicitação de saque foi enviada para análise.",
      });

      setWithdrawalAmount("");
      setPixKey("");
      setIsWithdrawalDialogOpen(false);
      
      // Recarregar comissões
      fetchCommissions();
      
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

  const handleSubmit = async () => {
    if (!formData.client_name || !formData.credit_value || !formData.commission_percentage || !formData.bank_name || !formData.product_type) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const creditValue = parseFloat(formData.credit_value.replace(/\D/g, '')) / 100;
      const commissionPercentage = parseFloat(formData.commission_percentage);
      const commissionAmount = (creditValue * commissionPercentage) / 100;

      const newCommission = {
        user_id: user?.id,
        client_name: formData.client_name,
        product_type: formData.product_type,
        bank_name: formData.bank_name,
        credit_value: creditValue,
        commission_amount: commissionAmount,
        commission_percentage: commissionPercentage,
        status: 'preview',
        proposal_date: formData.proposal_date || null,
        payment_method: formData.payment_method || null
      };

      const { error } = await supabase
        .from('commissions')
        .insert([newCommission]);

      if (error) throw error;

      toast({
        title: "Commission recorded successfully",
        description: "The commission has been added to your account",
      });

      setShowForm(false);
      setFormData({
        client_name: '',
        credit_value: '',
        commission_percentage: '',
        bank_name: '',
        product_type: '',
        proposal_date: '',
        payment_method: ''
      });
      fetchCommissions();
    } catch (error) {
      console.error('Error recording commission:', error);
      toast({
        title: "Error",
        description: "Failed to record commission",
        variant: "destructive",
      });
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

  const CommissionForm = ({ onSubmit, onCancel, formData, setFormData }: any) => (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Record New Commission</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="client_name">Client Name *</Label>
            <Input
              id="client_name"
              value={formData.client_name}
              onChange={(e) => setFormData({...formData, client_name: e.target.value})}
              placeholder="Enter client name"
            />
          </div>
          <div>
            <Label htmlFor="bank_name">Bank *</Label>
            <Input
              id="bank_name"
              value={formData.bank_name}
              onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
              placeholder="Enter bank name"
            />
          </div>
          <div>
            <Label htmlFor="product_type">Product Type *</Label>
            <Input
              id="product_type"
              value={formData.product_type}
              onChange={(e) => setFormData({...formData, product_type: e.target.value})}
              placeholder="Enter product type"
            />
          </div>
          <div>
            <Label htmlFor="credit_value">Credit Value *</Label>
            <Input
              id="credit_value"
              value={formData.credit_value}
              onChange={(e) => setFormData({...formData, credit_value: formatCurrencyInput(e.target.value)})}
              placeholder="R$ 0,00"
            />
          </div>
          <div>
            <Label htmlFor="commission_percentage">Commission % *</Label>
            <Input
              id="commission_percentage"
              type="number"
              step="0.01"
              value={formData.commission_percentage}
              onChange={(e) => setFormData({...formData, commission_percentage: e.target.value})}
              placeholder="Enter commission percentage"
            />
          </div>
          <div>
            <Label htmlFor="proposal_date">Proposal Date</Label>
            <Input
              id="proposal_date"
              type="date"
              value={formData.proposal_date}
              onChange={(e) => setFormData({...formData, proposal_date: e.target.value})}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="payment_method">Payment Method</Label>
            <Input
              id="payment_method"
              value={formData.payment_method}
              onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
              placeholder="Enter payment method"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <Button onClick={onSubmit} className="flex-1">
            Record Commission
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

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
      </div>

      {/* Commissions History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Histórico de Comissões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma comissão registrada ainda
              </p>
            ) : (
              commissions.map((commission) => {
                const statusInfo = statusConfig[commission.status as keyof typeof statusConfig];
                const Icon = statusInfo?.icon || Clock;
                
                return (
                  <div key={commission.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${statusInfo?.color || 'bg-muted/20'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{commission.client_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {commission.bank_name} - {commission.product_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(commission.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${Number(commission.commission_amount) < 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {formatCurrency(Number(commission.commission_amount))}
                      </p>
                      <Badge variant="outline" className={statusInfo?.color}>
                        {statusInfo?.label || commission.status}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}