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
import { jsPDF } from "jspdf";
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
  Plus,
  Search,
  FileDown
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
  const { user, isAdmin } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Use current date - ensure it uses the correct month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // getMonth() is 0-indexed
    return `${year}-${String(month).padStart(2, '0')}`;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [commissions, setCommissions] = useState<any[]>([]);
  const [commissionRules, setCommissionRules] = useState<any[]>([]);
  const [banksProducts, setBanksProducts] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [extractStartDate, setExtractStartDate] = useState("");
  const [extractEndDate, setExtractEndDate] = useState("");
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [isExtractDialogOpen, setIsExtractDialogOpen] = useState(false);
  const [isGestor, setIsGestor] = useState(false);
  const [gestorCompanyIds, setGestorCompanyIds] = useState<string[]>([]);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [isSubmittingExtract, setIsSubmittingExtract] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState<CommissionFormData>({
    client_name: '',
    credit_value: '',
    commission_percentage: '',
    bank_name: '',
    product_type: '',
    proposal_date: new Date().toISOString().split('T')[0], // Data de hoje por padrão
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

  // Check if user is gestor
  useEffect(() => {
    const checkGestorStatus = async () => {
      if (!user?.id || isAdmin) return;
      
      try {
        const { data, error } = await supabase
          .from('user_companies')
          .select('company_id, company_role')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (error) throw error;
        
        const gestorCompanies = (data || []).filter(uc => uc.company_role === 'gestor');
        setIsGestor(gestorCompanies.length > 0);
        setGestorCompanyIds((data || []).map(uc => uc.company_id));
        
        // Store user's primary company_id for when they create commissions
        if (data && data.length > 0) {
          setUserCompanyId(data[0].company_id);
        }
      } catch (error) {
        console.error('Error checking gestor status:', error);
      }
    };
    
    checkGestorStatus();
  }, [user?.id, isAdmin]);

  // Carregar dados das comissões e bancos/produtos
  useEffect(() => {
    if (user?.id) {
      fetchCommissions();
    }
  }, [user?.id, isAdmin, isGestor, gestorCompanyIds]);

  const fetchCommissions = async () => {
    if (!user?.id) return;
    
    try {
      // Buscar comissões baseado no papel do usuário
      let commissionsQuery = supabase
        .from('commissions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (isAdmin) {
        // Admin vê todas as comissões (sem filtro)
      } else if (isGestor && gestorCompanyIds.length > 0) {
        // Gestor vê comissões da empresa + próprias
        commissionsQuery = commissionsQuery.or(
          `user_id.eq.${user.id},company_id.in.(${gestorCompanyIds.join(',')})`
        );
      } else {
        // Colaborador vê apenas suas próprias comissões
        commissionsQuery = commissionsQuery.eq('user_id', user.id);
      }

      const { data: userCommissions, error: commissionsError } = await commissionsQuery;

      if (commissionsError) {
        console.error('Erro ao buscar comissões:', commissionsError);
        throw commissionsError;
      }

      console.log('Comissões carregadas:', userCommissions?.length, userCommissions);
      
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

      setCommissions(userCommissions || []);
      if (banksProductsData) setBanksProducts(banksProductsData);
      if (commissionTableResponse) setCommissionTableData(commissionTableResponse);
      if (commissionRulesData) setCommissionRules(commissionRulesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleWithdrawalRequest = async () => {
    // Verificar se há comissões em preview para poder sacar
    if (commissionTotals.preview === 0) {
      toast({
        title: "Sem comissões para saque",
        description: "Você precisa ter comissões em 'Prévia de comissão' para solicitar um saque.",
        variant: "destructive",
      });
      return;
    }

    if (!withdrawalAmount || parseFloat(withdrawalAmount.replace(/[^\d,]/g, '').replace(',', '.')) < 50) {
      toast({
        title: "Valor inválido",
        description: "O valor mínimo para saque é R$ 50,00",
        variant: "destructive",
      });
      return;
    }

    const requestedAmount = parseFloat(withdrawalAmount.replace(/[^\d,]/g, '').replace(',', '.'));
    if (requestedAmount > commissionTotals.preview) {
      toast({
        title: "Valor superior à prévia",
        description: `Você só pode sacar até R$ ${commissionTotals.preview.toFixed(2)} que está em prévia.`,
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
        company_id: userCompanyId,
        client_name: formData.client_name,
        product_type: formData.product_type,
        bank_name: formData.bank_name,
        credit_value: creditValue,
        commission_amount: commissionAmount,
        commission_percentage: commissionPercentage,
        status: 'preview',
        proposal_date: formData.proposal_date,
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
        proposal_date: new Date().toISOString().split('T')[0],
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
            {isAdmin ? 'Todas as Comissões' : isGestor ? 'Comissões da Equipe' : 'Minhas Comissões'}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin 
              ? 'Visualize e gerencie comissões de todos os usuários' 
              : isGestor 
                ? 'Visualize comissões da sua equipe e empresa' 
                : 'Acompanhe seus ganhos e histórico de pagamentos'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total do Mês</p>
                <p className="text-2xl font-bold text-foreground">
                  {(() => {
                    const [year, month] = selectedMonth.split('-').map(Number);
                    const paidThisMonth = commissions.filter(c => {
                      if (c.status !== 'paid' || !c.payment_date) return false;
                      // Parse date directly to avoid timezone issues
                      const dateParts = c.payment_date.split('-');
                      const paymentYear = parseInt(dateParts[0]);
                      const paymentMonth = parseInt(dateParts[1]);
                      return paymentMonth === month && paymentYear === year && c.commission_amount > 0;
                    });
                    
                    const total = paidThisMonth.reduce((sum, c) => sum + Number(c.commission_amount), 0);
                    return formatCurrency(total);
                  })()}
                </p>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-40 mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const now = new Date();
                      const currentYear = now.getFullYear();
                      const currentMonth = now.getMonth();
                      const months = [];
                      
                      // Start from January 2026, go up to current month only
                      const startYear = 2026;
                      const startMonth = 0; // January
                      
                      for (let y = startYear; y <= currentYear; y++) {
                        const monthStart = (y === startYear) ? startMonth : 0;
                        const monthEnd = (y === currentYear) ? currentMonth : 11;
                        
                        for (let m = monthStart; m <= monthEnd; m++) {
                          const date = new Date(y, m, 1);
                          const value = `${y}-${String(m + 1).padStart(2, '0')}`;
                          const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                          months.push({ value, label });
                        }
                      }
                      
                      // Reverse to show most recent first
                      return months.reverse().map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {(() => {
                    const [year, month] = selectedMonth.split('-').map(Number);
                    return commissions.filter(c => {
                      if (c.status !== 'paid' || !c.payment_date) return false;
                      const paymentDate = new Date(c.payment_date);
                      return paymentDate.getMonth() === (month - 1) && paymentDate.getFullYear() === year && c.commission_amount > 0;
                    }).length;
                  })()} comissões pagas no mês
                </p>
              </div>
              <div className="p-2 bg-success/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-success" />
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
                  {positiveCommissions.filter(c => c.status === 'preview').length} comissões lançadas
                </p>
              </div>
              <div className="p-2 bg-muted/20 rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange/10 to-orange/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(commissionTotals.pending)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {positiveCommissions.filter(c => c.status === 'pending').length} comissões e leads
                </p>
              </div>
              <div className="p-2 bg-warning/10 rounded-lg">
                <Clock className="h-5 w-5 text-warning" />
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Histórico de Comissões
            </CardTitle>
            <Button 
              variant="outline" 
              onClick={() => {
                // Gerar PDF das comissões do mês selecionado
                const [year, month] = selectedMonth.split('-').map(Number);
                const monthName = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                
                // Filtrar comissões pagas do mês
                const paidCommissions = commissions.filter(c => {
                  if (c.status !== 'paid' || !c.payment_date) return false;
                  const dateParts = c.payment_date.split('-');
                  const paymentYear = parseInt(dateParts[0]);
                  const paymentMonth = parseInt(dateParts[1]);
                  return paymentMonth === month && paymentYear === year && c.commission_amount > 0;
                });
                
                if (paidCommissions.length === 0) {
                  toast({
                    title: "Sem comissões",
                    description: `Não há comissões pagas em ${monthName}`,
                    variant: "destructive",
                  });
                  return;
                }
                
                const doc = new jsPDF();
                const pageWidth = doc.internal.pageSize.getWidth();
                
                // Header
                doc.setFontSize(18);
                doc.setFont("helvetica", "bold");
                doc.text("Extrato de Comissões", pageWidth / 2, 20, { align: "center" });
                
                doc.setFontSize(12);
                doc.setFont("helvetica", "normal");
                doc.text(`Período: ${monthName}`, pageWidth / 2, 30, { align: "center" });
                doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 38, { align: "center" });
                
                // Summary
                const totalPaid = paidCommissions.reduce((sum, c) => sum + Number(c.commission_amount), 0);
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.text(`Total de Comissões: ${formatCurrency(totalPaid)}`, 14, 52);
                doc.text(`Quantidade: ${paidCommissions.length} comissões`, 14, 60);
                
                // Table header
                let yPos = 75;
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.setFillColor(240, 240, 240);
                doc.rect(14, yPos - 5, pageWidth - 28, 8, "F");
                doc.text("Cliente", 16, yPos);
                doc.text("Banco", 70, yPos);
                doc.text("Produto", 105, yPos);
                doc.text("Valor", 150, yPos);
                doc.text("Comissão", 175, yPos);
                
                yPos += 10;
                doc.setFont("helvetica", "normal");
                
                // Table rows
                paidCommissions.forEach((commission, index) => {
                  if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                  }
                  
                  // Alternate row background
                  if (index % 2 === 0) {
                    doc.setFillColor(250, 250, 250);
                    doc.rect(14, yPos - 4, pageWidth - 28, 7, "F");
                  }
                  
                  const clientName = commission.client_name.length > 20 
                    ? commission.client_name.substring(0, 20) + "..." 
                    : commission.client_name;
                  const bankName = commission.bank_name.length > 12
                    ? commission.bank_name.substring(0, 12) + "..."
                    : commission.bank_name;
                  const productType = commission.product_type.length > 15
                    ? commission.product_type.substring(0, 15) + "..."
                    : commission.product_type;
                  
                  doc.text(clientName, 16, yPos);
                  doc.text(bankName, 70, yPos);
                  doc.text(productType, 105, yPos);
                  doc.text(`R$ ${Number(commission.credit_value || 0).toFixed(2)}`, 150, yPos);
                  doc.text(`R$ ${Number(commission.commission_amount).toFixed(2)}`, 175, yPos);
                  
                  yPos += 7;
                });
                
                // Footer
                yPos += 10;
                doc.setDrawColor(200, 200, 200);
                doc.line(14, yPos, pageWidth - 14, yPos);
                yPos += 8;
                doc.setFont("helvetica", "bold");
                doc.text(`TOTAL: ${formatCurrency(totalPaid)}`, pageWidth - 14, yPos, { align: "right" });
                
                // Save PDF
                const fileName = `comissoes_${year}_${String(month).padStart(2, '0')}.pdf`;
                doc.save(fileName);
                
                toast({
                  title: "PDF gerado!",
                  description: `Extrato de ${monthName} baixado com sucesso.`,
                });
              }}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Gerar PDF
            </Button>
          </div>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por CPF ou número da proposta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(() => {
              // Filtrar comissões do mês selecionado se o status for 'paid'
               const [year, month] = selectedMonth.split('-').map(Number);
               let filteredCommissions = commissions;

               // Exibir apenas comissões que já foram pagas
               filteredCommissions = filteredCommissions.filter(c => c.status === 'paid');

               // Aplicar filtro de mês - filtrar TODAS as comissões do mês selecionado
               filteredCommissions = filteredCommissions.filter(c => {
                 // Para comissões pagas, usar data de pagamento
                 if (c.status === 'paid' && c.payment_date) {
                   // Parse date as UTC to avoid timezone issues
                   const dateParts = c.payment_date.split('-');
                   const paymentYear = parseInt(dateParts[0]);
                   const paymentMonth = parseInt(dateParts[1]);
                   return paymentMonth === month && paymentYear === year;
                 }
                 // Para outras comissões, usar data de criação
                 const createdDate = new Date(c.created_at);
                 return createdDate.getUTCMonth() === (month - 1) && createdDate.getUTCFullYear() === year;
               });

              // Aplicar filtro de busca
              if (searchTerm) {
                filteredCommissions = filteredCommissions.filter(c => 
                  (c.cpf && c.cpf.includes(searchTerm)) ||
                  (c.proposal_number && c.proposal_number.includes(searchTerm)) ||
                  c.client_name.toLowerCase().includes(searchTerm.toLowerCase())
                );
              }

              return filteredCommissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {searchTerm ? 'Nenhuma comissão encontrada para o termo pesquisado' : 'Nenhuma comissão registrada ainda'}
                </p>
              ) : (
                filteredCommissions.map((commission) => {
                  const statusInfo = statusConfig[commission.status as keyof typeof statusConfig];
                  const Icon = statusInfo?.icon || Clock;
                  
                  return (
                    <div key={commission.id} className="p-4 border rounded-lg bg-card hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${statusInfo?.color || 'bg-muted/20'}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-lg">{commission.client_name}</h4>
                            <div className="text-right">
                              <p className={`font-bold text-lg ${Number(commission.commission_amount) < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                {formatCurrency(Number(commission.commission_amount))}
                              </p>
                              <Badge variant="outline" className={`${statusInfo?.color} text-xs`}>
                                {statusInfo?.label || commission.status}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Usuário:</span>
                              <span className="ml-2 font-medium">{commission.user?.name || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Proposta:</span>
                              <span className="ml-2 font-medium">{commission.proposal_number || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">CPF:</span>
                              <span className="ml-2 font-medium">{commission.cpf || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Banco:</span>
                              <span className="ml-2 font-medium">{commission.bank_name}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Produto:</span>
                              <span className="ml-2 font-medium">{commission.product_type}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Data:</span>
                              <span className="ml-2 font-medium">{formatDate(commission.created_at)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Valor Bruto:</span>
                              <span className="ml-2 font-medium text-blue-600">R$ {commission.credit_value?.toFixed(2) || '0,00'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Percentual:</span>
                              <span className="ml-2 font-medium">{commission.commission_percentage || 0}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Comissão:</span>
                              <span className="ml-2 font-bold text-green-600">{formatCurrency(Number(commission.commission_amount))}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}