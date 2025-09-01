import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, DollarSign } from "lucide-react";

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
  commission_percentage: number;
  user_percentage: number;
}

interface PremiumCommissionForm {
  user_id: string;
  client_name: string;
  cpf: string;
  proposal_number: string;
  credit_value: string;
  bank_name: string;
  product_type: string;
  commission_percentage: string;
}

export function AdminPremiumLeads() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<PremiumCommissionForm>({
    user_id: '',
    client_name: '',
    cpf: '',
    proposal_number: '',
    credit_value: '',
    bank_name: '',
    product_type: '',
    commission_percentage: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchCommissionRules();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const fetchCommissionRules = async () => {
    try {
      const { data, error } = await supabase
        .from('commission_table')
        .select('*')
        .eq('is_active', true)
        .order('bank_name, product_name');
      
      if (error) throw error;
      setCommissionRules(data || []);
    } catch (error) {
      console.error('Erro ao carregar regras de comissão:', error);
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

  const handleSubmit = async () => {
    if (!formData.user_id || !formData.client_name || !formData.cpf || !formData.proposal_number || 
        !formData.credit_value || !formData.bank_name || !formData.product_type || !formData.commission_percentage) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const creditValue = parseFloat(formData.credit_value.replace(/\D/g, '')) / 100;
      const commissionPercentage = parseFloat(formData.commission_percentage);
      const commissionAmount = (creditValue * commissionPercentage) / 100;

      const { error } = await supabase
        .from('commissions')
        .insert({
          user_id: formData.user_id,
          client_name: formData.client_name,
          bank_name: formData.bank_name,
          product_type: formData.product_type,
          credit_value: creditValue,
          commission_amount: commissionAmount,
          commission_percentage: commissionPercentage,
          proposal_number: formData.proposal_number,
          proposal_date: new Date().toISOString().split('T')[0],
          cpf: formData.cpf,
          status: 'preview'
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Comissão de lead premium lançada com sucesso",
      });

      // Limpar form e fechar dialog
      setFormData({
        user_id: '',
        client_name: '',
        cpf: '',
        proposal_number: '',
        credit_value: '',
        bank_name: '',
        product_type: '',
        commission_percentage: ''
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao lançar comissão:', error);
      toast({
        title: "Erro",
        description: "Erro ao lançar comissão de lead premium",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Lançar Comissões - Leads Premium
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Lance comissões manualmente para leads premium
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Lançar Comissão
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Lançar Comissão - Lead Premium</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Usuário *</Label>
                    <Select onValueChange={(value) => setFormData({...formData, user_id: value})}>
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
                  
                  <div>
                    <Label>Banco *</Label>
                    <Select onValueChange={(value) => {
                      setFormData({...formData, bank_name: value, product_type: '', commission_percentage: ''});
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o banco" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...new Set(commissionRules.map(r => r.bank_name))].map((bank) => (
                          <SelectItem key={bank} value={bank}>
                            {bank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Produto *</Label>
                    <Select 
                      onValueChange={(value) => {
                        const selectedRule = commissionRules.find(r => r.bank_name === formData.bank_name && r.product_name === value);
                        setFormData({
                          ...formData, 
                          product_type: value,
                          commission_percentage: selectedRule ? selectedRule.user_percentage.toString() : ''
                        });
                      }}
                      disabled={!formData.bank_name}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {commissionRules
                          .filter(r => r.bank_name === formData.bank_name)
                          .map((rule) => (
                            <SelectItem key={rule.id} value={rule.product_name}>
                              {rule.product_name} ({rule.user_percentage}%)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Nome do Cliente *</Label>
                    <Input
                      placeholder="Nome completo do cliente"
                      value={formData.client_name}
                      onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label>CPF *</Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label>Número da Proposta *</Label>
                    <Input
                      placeholder="Ex: 2024001234"
                      value={formData.proposal_number}
                      onChange={(e) => setFormData({...formData, proposal_number: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label>Valor Bruto da Operação *</Label>
                    <Input
                      placeholder="R$ 0,00"
                      value={formData.credit_value}
                      onChange={(e) => setFormData({...formData, credit_value: formatCurrencyInput(e.target.value)})}
                    />
                  </div>
                  
                  <div>
                    <Label>% de Comissão *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 2.5"
                      value={formData.commission_percentage}
                      onChange={(e) => setFormData({...formData, commission_percentage: e.target.value})}
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <div className="w-full">
                      <Label>Valor da Comissão</Label>
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        {formData.credit_value && formData.commission_percentage ? 
                          `R$ ${((parseFloat(formData.credit_value.replace(/\D/g, '')) / 100) * parseFloat(formData.commission_percentage || '0') / 100).toFixed(2)}` :
                          'R$ 0,00'
                        }
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                    {loading ? "Processando..." : "Lançar Comissão"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Utilize o botão acima para lançar comissões de leads premium</p>
          <p className="text-sm mt-1">As comissões lançadas aparecerão automaticamente em "Gerenciar Pagamentos"</p>
        </div>
      </CardContent>
    </Card>
  );
}