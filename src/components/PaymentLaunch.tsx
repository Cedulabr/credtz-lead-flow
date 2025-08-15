import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Calculator } from "lucide-react";

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
}

interface PaymentData {
  user_id: string;
  bank_name: string;
  product_name: string;
  client_name: string;
  cpf: string;
  proposal_number: string;
  credit_value: number;
  term: string;
}

export function PaymentLaunch() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculatedCommission, setCalculatedCommission] = useState(0);
  
  const [formData, setFormData] = useState<PaymentData>({
    user_id: "",
    bank_name: "",
    product_name: "",
    client_name: "",
    cpf: "",
    proposal_number: "",
    credit_value: 0,
    term: ""
  });

  useEffect(() => {
    fetchUsers();
    fetchCommissionRules();
  }, []);

  useEffect(() => {
    calculateCommission();
  }, [formData.user_id, formData.bank_name, formData.product_name, formData.credit_value, formData.term]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'partner');
      
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

  const calculateCommission = () => {
    if (!formData.bank_name || !formData.product_name || !formData.credit_value || !formData.term) {
      setCalculatedCommission(0);
      return;
    }

    const rule = commissionRules.find(r => 
      r.bank_name === formData.bank_name && 
      r.product_name === formData.product_name &&
      (r.term === formData.term || !r.term)
    );

    if (rule) {
      const commission = (formData.credit_value * rule.user_percentage) / 100;
      setCalculatedCommission(commission);
    } else {
      setCalculatedCommission(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_id || !formData.bank_name || !formData.product_name || !formData.client_name || !formData.cpf || !calculatedCommission) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const rule = commissionRules.find(r => 
        r.bank_name === formData.bank_name && 
        r.product_name === formData.product_name &&
        (r.term === formData.term || !r.term)
      );

      const commissionData = {
        user_id: formData.user_id,
        bank_name: formData.bank_name,
        product_type: formData.product_name,
        client_name: formData.client_name,
        credit_value: formData.credit_value,
        commission_amount: calculatedCommission,
        commission_percentage: rule?.user_percentage || 0,
        status: 'preview', // Status inicial: prévia
        proposal_date: new Date().toISOString().split('T')[0],
      };

      const { error } = await supabase
        .from('commissions')
        .insert(commissionData);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Pagamento lançado com sucesso!",
      });

      // Reset form
      setFormData({
        user_id: "",
        bank_name: "",
        product_name: "",
        client_name: "",
        cpf: "",
        proposal_number: "",
        credit_value: 0,
        term: ""
      });
      setCalculatedCommission(0);

    } catch (error) {
      console.error('Erro ao lançar pagamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao lançar pagamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uniqueBanks = [...new Set(commissionRules.map(rule => rule.bank_name))];
  const filteredProducts = commissionRules.filter(rule => rule.bank_name === formData.bank_name);
  const uniqueProducts = [...new Set(filteredProducts.map(rule => rule.product_name))];
  const filteredTerms = commissionRules.filter(rule => 
    rule.bank_name === formData.bank_name && rule.product_name === formData.product_name
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Lançar Pagamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="user_id">Usuário *</Label>
              <Select 
                value={formData.user_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} - {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bank_name">Banco *</Label>
              <Select 
                value={formData.bank_name} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, bank_name: value, product_name: "", term: "" }))}
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

            <div>
              <Label htmlFor="product_name">Produto *</Label>
              <Select 
                value={formData.product_name} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, product_name: value, term: "" }))}
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

            <div>
              <Label htmlFor="term">Prazo</Label>
              <Select 
                value={formData.term} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, term: value }))}
                disabled={!formData.product_name}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o prazo" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTerms.map((rule) => (
                    rule.term && (
                      <SelectItem key={rule.id} value={rule.term}>
                        {rule.term}
                      </SelectItem>
                    )
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="client_name">Nome do Cliente *</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                placeholder="Digite o nome do cliente"
              />
            </div>

            <div>
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <Label htmlFor="proposal_number">Número da Proposta</Label>
              <Input
                id="proposal_number"
                value={formData.proposal_number}
                onChange={(e) => setFormData(prev => ({ ...prev, proposal_number: e.target.value }))}
                placeholder="Digite o número da proposta"
              />
            </div>

            <div>
              <Label htmlFor="credit_value">Valor Base da Operação (R$) *</Label>
              <Input
                id="credit_value"
                type="number"
                step="0.01"
                value={formData.credit_value}
                onChange={(e) => setFormData(prev => ({ ...prev, credit_value: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
          </div>

          {calculatedCommission > 0 && (
            <Card className="bg-muted/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calculator className="h-4 w-4" />
                  Prévia do Pagamento: R$ {calculatedCommission.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          )}

          <Button type="submit" disabled={loading || calculatedCommission === 0} className="w-full">
            {loading ? "Salvando..." : "Lançar Pagamento"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}