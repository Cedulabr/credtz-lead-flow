import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Plus, TrendingUp, Clock, CheckCircle, Calculator, Edit, Trash2, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface User {
  id: string;
  name: string;
  email: string;
}

interface CommissionRule {
  id: string;
  bank_name: string;
  product_name: string;
  term?: string;
  user_percentage: number;
  commission_percentage: number;
}

interface Commission {
  id: string;
  user_id: string;
  client_name: string;
  cpf: string;
  bank_name: string;
  product_type: string;
  credit_value: number;
  commission_percentage: number;
  commission_amount: number;
  proposal_number: string;
  status: string;
  payment_date: string | null;
  created_at: string;
  user?: {
    name: string;
    email: string;
  } | null;
}

export function ContaCorrente() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [calculatedCommission, setCalculatedCommission] = useState(0);
  const [editingCommissionId, setEditingCommissionId] = useState<string | null>(null);
  const [refundingCommission, setRefundingCommission] = useState<Commission | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  
  const [formData, setFormData] = useState({
    user_id: "",
    bank_name: "",
    product_name: "",
    term: "",
    client_name: "",
    cpf: "",
    proposal_number: "",
    credit_value: 0,
    commission_percentage: 0
  });

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchCommissionRules();
      fetchCommissions();
    }
  }, [isAdmin]);

  useEffect(() => {
    calculateCommission();
  }, [formData.bank_name, formData.product_name, formData.credit_value, formData.term]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'partner')
        .order('name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };

  const fetchCommissionRules = async () => {
    try {
      const { data, error } = await supabase
        .from('commission_table')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      setCommissionRules(data || []);
    } catch (error) {
      console.error('Erro ao buscar regras de comissão:', error);
    }
  };

  const fetchCommissions = async () => {
    try {
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('commissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (commissionsError) throw commissionsError;
      
      if (commissionsData && commissionsData.length > 0) {
        const userIds = [...new Set(commissionsData.map(c => c.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);
        
        const profilesMap = new Map(
          (profilesData || []).map(p => [p.id, p])
        );
        
        const commissionsWithUsers = commissionsData.map(comm => ({
          ...comm,
          user: profilesMap.get(comm.user_id) || null
        }));
        
        setCommissions(commissionsWithUsers as any);
      } else {
        setCommissions([]);
      }
    } catch (error) {
      console.error('Erro ao buscar comissões:', error);
    }
  };

  const calculateCommission = () => {
    if (!formData.bank_name || !formData.product_name || !formData.credit_value) {
      setCalculatedCommission(0);
      setFormData(prev => ({ ...prev, commission_percentage: 0 }));
      return;
    }

    const rule = commissionRules.find(r => 
      r.bank_name === formData.bank_name && 
      r.product_name === formData.product_name &&
      (r.term === formData.term || !r.term || !formData.term)
    );

    if (rule) {
      const commissionAmount = (formData.credit_value * rule.user_percentage) / 100;
      setCalculatedCommission(commissionAmount);
      setFormData(prev => ({ ...prev, commission_percentage: rule.user_percentage }));
    } else {
      setCalculatedCommission(0);
      setFormData(prev => ({ ...prev, commission_percentage: 0 }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.user_id || !formData.client_name || !formData.bank_name || 
        !formData.product_name || !formData.credit_value || calculatedCommission === 0) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (editingCommissionId) {
        const { error } = await supabase
          .from('commissions')
          .update({
            user_id: formData.user_id,
            client_name: formData.client_name,
            cpf: formData.cpf || null,
            bank_name: formData.bank_name,
            product_type: formData.product_name,
            credit_value: formData.credit_value,
            commission_percentage: formData.commission_percentage,
            commission_amount: calculatedCommission,
            proposal_number: formData.proposal_number || null,
          })
          .eq('id', editingCommissionId);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Comissão atualizada com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('commissions')
          .insert({
            user_id: formData.user_id,
            client_name: formData.client_name,
            cpf: formData.cpf || null,
            bank_name: formData.bank_name,
            product_type: formData.product_name,
            credit_value: formData.credit_value,
            commission_percentage: formData.commission_percentage,
            commission_amount: calculatedCommission,
            proposal_number: formData.proposal_number || null,
            proposal_date: new Date().toISOString().split('T')[0],
            status: 'pending'
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Comissão lançada com sucesso"
        });
      }

      setIsDialogOpen(false);
      setEditingCommissionId(null);
      setFormData({
        user_id: "",
        bank_name: "",
        product_name: "",
        term: "",
        client_name: "",
        cpf: "",
        proposal_number: "",
        credit_value: 0,
        commission_percentage: 0
      });
      setCalculatedCommission(0);
      fetchCommissions();
    } catch (error) {
      console.error('Erro ao salvar comissão:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar comissão",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCommission = (commission: Commission) => {
    setEditingCommissionId(commission.id);
    setFormData({
      user_id: commission.user_id,
      bank_name: commission.bank_name,
      product_name: commission.product_type,
      term: "",
      client_name: commission.client_name,
      cpf: commission.cpf || "",
      proposal_number: commission.proposal_number || "",
      credit_value: commission.credit_value,
      commission_percentage: commission.commission_percentage,
    });
    setCalculatedCommission(commission.commission_amount);
    setIsDialogOpen(true);
  };

  const handleDeleteCommission = async (commissionId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta comissão?')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('commissions')
        .delete()
        .eq('id', commissionId);

      if (error) throw error;

      toast({
        title: "Comissão excluída",
        description: "A comissão foi removida com sucesso."
      });

      fetchCommissions();
    } catch (error) {
      console.error('Erro ao excluir comissão:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir comissão",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (commissionId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('commissions')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', commissionId);

      if (error) throw error;

      toast({
        title: "Pagamento registrado",
        description: "Comissão marcada como paga"
      });

      fetchCommissions();
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!refundingCommission) return;

    const refundValue = parseFloat(refundAmount.replace(/[^\d,]/g, '').replace(',', '.'));
    
    if (!refundValue || refundValue <= 0) {
      toast({
        title: "Erro",
        description: "Informe um valor válido para estorno",
        variant: "destructive"
      });
      return;
    }

    if (refundValue > refundingCommission.commission_amount) {
      toast({
        title: "Erro",
        description: "Valor de estorno maior que a comissão original",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Inserir registro de estorno como comissão negativa
      const { error } = await supabase
        .from('commissions')
        .insert({
          user_id: refundingCommission.user_id,
          client_name: `ESTORNO: ${refundingCommission.client_name}`,
          cpf: refundingCommission.cpf,
          bank_name: refundingCommission.bank_name,
          product_type: refundingCommission.product_type,
          credit_value: -refundValue,
          commission_percentage: refundingCommission.commission_percentage,
          commission_amount: -refundValue,
          proposal_number: refundingCommission.proposal_number,
          proposal_date: new Date().toISOString().split('T')[0],
          status: 'refunded'
        });

      if (error) throw error;

      // Atualizar status da comissão original para indicar que foi estornada
      await supabase
        .from('commissions')
        .update({ status: 'refunded' })
        .eq('id', refundingCommission.id);

      toast({
        title: "Estorno registrado",
        description: `Estorno de R$ ${refundValue.toFixed(2)} realizado com sucesso`
      });

      setIsRefundDialogOpen(false);
      setRefundingCommission(null);
      setRefundAmount("");
      fetchCommissions();
    } catch (error) {
      console.error('Erro ao registrar estorno:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar estorno",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const uniqueBanks = [...new Set(commissionRules.map(r => r.bank_name))];
  const uniqueProducts = formData.bank_name 
    ? [...new Set(commissionRules.filter(r => r.bank_name === formData.bank_name).map(r => r.product_name))]
    : [];
  const uniqueTerms = formData.bank_name && formData.product_name
    ? [...new Set(commissionRules
        .filter(r => r.bank_name === formData.bank_name && r.product_name === formData.product_name && r.term)
        .map(r => r.term as string))]
    : [];

  const statusConfig = {
    pending: { label: "Pendente", variant: "secondary" as const, icon: Clock },
    paid: { label: "Pago", variant: "default" as const, icon: CheckCircle },
    refunded: { label: "Estornado", variant: "destructive" as const, icon: RotateCcw }
  };

  const totalPending = commissions
    .filter(c => c.status === 'pending' && c.commission_amount > 0)
    .reduce((sum, c) => sum + c.commission_amount, 0);
  
  const totalPaid = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.commission_amount, 0);

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso Restrito</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Apenas administradores podem acessar esta funcionalidade.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Conta Corrente
          </h2>
          <p className="text-muted-foreground">Gerencie o lançamento e pagamento de comissões</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingCommissionId(null);
              setFormData({
                user_id: "",
                bank_name: "",
                product_name: "",
                term: "",
                client_name: "",
                cpf: "",
                proposal_number: "",
                credit_value: 0,
                commission_percentage: 0
              });
              setCalculatedCommission(0);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Lançar Comissão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCommissionId ? 'Editar Comissão' : 'Lançar Nova Comissão'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user_id">Usuário *</Label>
                  <Select
                    value={formData.user_id}
                    onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_name">Banco *</Label>
                  <Select
                    value={formData.bank_name}
                    onValueChange={(value) => setFormData({ ...formData, bank_name: value, product_name: "", term: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueBanks.map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product_name">Produto *</Label>
                  <Select
                    value={formData.product_name}
                    onValueChange={(value) => setFormData({ ...formData, product_name: value, term: "" })}
                    disabled={!formData.bank_name}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueProducts.map((product) => (
                        <SelectItem key={product} value={product}>
                          {product}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {uniqueTerms.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="term">Prazo</Label>
                    <Select
                      value={formData.term}
                      onValueChange={(value) => setFormData({ ...formData, term: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o prazo" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueTerms.map((term) => (
                          <SelectItem key={term} value={term}>
                            {term}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="client_name">Nome do Cliente *</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proposal_number">Número da Proposta</Label>
                  <Input
                    id="proposal_number"
                    value={formData.proposal_number}
                    onChange={(e) => setFormData({ ...formData, proposal_number: e.target.value })}
                    placeholder="Ex: 123456"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credit_value">Valor Bruto da Operação *</Label>
                  <Input
                    id="credit_value"
                    type="number"
                    step="0.01"
                    value={formData.credit_value || ""}
                    onChange={(e) => setFormData({ ...formData, credit_value: parseFloat(e.target.value) || 0 })}
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>

              {calculatedCommission > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">Comissão Calculada</p>
                          <p className="text-xs text-muted-foreground">
                            {formData.commission_percentage}% sobre R$ {formData.credit_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        R$ {calculatedCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || calculatedCommission === 0}>
                  {loading ? "Processando..." : editingCommissionId ? "Atualizar" : "Lançar Comissão"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pago</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Comissões</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {commissions.filter(c => c.commission_amount > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comissões Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma comissão lançada
              </p>
            ) : (
              commissions.map((commission) => {
                const StatusIcon = statusConfig[commission.status as keyof typeof statusConfig]?.icon || Clock;
                return (
                  <div
                    key={commission.id}
                    className="flex flex-col gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{commission.client_name}</p>
                          <Badge variant={statusConfig[commission.status as keyof typeof statusConfig]?.variant || "outline"}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[commission.status as keyof typeof statusConfig]?.label || commission.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {commission.user?.name} • {commission.bank_name} • {commission.product_type}
                        </p>
                        {commission.proposal_number && (
                          <p className="text-xs text-muted-foreground">
                            Proposta: {commission.proposal_number}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${commission.commission_amount < 0 ? 'text-destructive' : 'text-primary'}`}>
                          R$ {Math.abs(commission.commission_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {commission.commission_percentage}% de R$ {Math.abs(commission.credit_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      {commission.status === 'pending' && commission.commission_amount > 0 && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsPaid(commission.id)}
                          disabled={loading}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Marcar como Pago
                        </Button>
                      )}
                      
                      {commission.commission_amount > 0 && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditCommission(commission)}
                            disabled={loading}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteCommission(commission.id)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Apagar
                          </Button>
                          
                          {(commission.status === 'paid' || commission.status === 'pending') && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setRefundingCommission(commission);
                                setRefundAmount("");
                                setIsRefundDialogOpen(true);
                              }}
                              disabled={loading}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Estornar
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Estorno */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estornar Comissão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {refundingCommission && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold">{refundingCommission.client_name}</p>
                <p className="text-sm text-muted-foreground">
                  Valor da comissão: R$ {refundingCommission.commission_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="refund_amount">Valor do Estorno *</Label>
              <Input
                id="refund_amount"
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="R$ 0,00"
                max={refundingCommission?.commission_amount}
              />
              <p className="text-xs text-muted-foreground">
                Valor máximo: R$ {refundingCommission?.commission_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRefundDialogOpen(false);
                  setRefundingCommission(null);
                  setRefundAmount("");
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleRefund}
                disabled={loading}
              >
                {loading ? "Processando..." : "Confirmar Estorno"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
