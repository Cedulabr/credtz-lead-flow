import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Edit, Trash2, Building2, Landmark, Package, Award, Calculator, DollarSign, Search, Filter, RefreshCw } from "lucide-react";

interface CommissionRule {
  id: string;
  company_id: string | null;
  bank_name: string;
  product_name: string;
  operation_type: string | null;
  user_level: string;
  calculation_model: string;
  commission_type: string;
  commission_value: number;
  secondary_commission_value: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  company?: { name: string } | null;
}

interface Company {
  id: string;
  name: string;
}

const USER_LEVELS = [
  { value: 'bronze', label: 'Bronze', color: 'bg-amber-700' },
  { value: 'prata', label: 'Prata', color: 'bg-gray-400' },
  { value: 'ouro', label: 'Ouro', color: 'bg-yellow-500' },
  { value: 'diamante', label: 'Diamante', color: 'bg-cyan-400' },
];

const CALCULATION_MODELS = [
  { value: 'saldo_devedor', label: 'Saldo Devedor', description: 'Calcula sobre o saldo devedor' },
  { value: 'valor_bruto', label: 'Valor Bruto', description: 'Calcula sobre o valor bruto da operação' },
  { value: 'ambos', label: 'Ambos', description: 'Calcula sobre saldo devedor + valor bruto' },
];

const PRODUCTS = [
  'Novo',
  'Refinanciamento',
  'Portabilidade',
  'Cartão',
  'Margem Livre',
  'Consórcio',
];

const COMMISSION_TYPES = [
  { value: 'percentage', label: 'Percentual (%)', icon: '%' },
  { value: 'fixed', label: 'Valor Fixo (R$)', icon: 'R$' },
];

export function AdminCommissionRules() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  
  // Form state
  const [formData, setFormData] = useState({
    company_id: "",
    bank_name: "",
    product_name: "",
    operation_type: "",
    user_level: "bronze",
    calculation_model: "valor_bruto",
    commission_type: "percentage",
    commission_value: "",
    secondary_commission_value: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch rules with company info
      const { data: rulesData, error: rulesError } = await supabase
        .from('commission_rules')
        .select(`
          *,
          company:companies(name)
        `)
        .order('created_at', { ascending: false });

      if (rulesError) throw rulesError;
      setRules(rulesData || []);

      // Fetch companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      setCompanies(companiesData || []);

      // Fetch banks from televendas_banks table
      const { data: banksData } = await supabase
        .from('televendas_banks')
        .select('name')
        .eq('is_active', true)
        .order('name');
      
      const bankNames = banksData?.map(b => b.name) || [];
      setBanks(bankNames);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      company_id: "",
      bank_name: "",
      product_name: "",
      operation_type: "",
      user_level: "bronze",
      calculation_model: "valor_bruto",
      commission_type: "percentage",
      commission_value: "",
      secondary_commission_value: "",
      description: "",
      is_active: true,
    });
    setEditingRule(null);
  };

  const handleOpenDialog = (rule?: CommissionRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        company_id: rule.company_id || "",
        bank_name: rule.bank_name,
        product_name: rule.product_name,
        operation_type: rule.operation_type || "",
        user_level: rule.user_level,
        calculation_model: rule.calculation_model,
        commission_type: rule.commission_type,
        commission_value: rule.commission_value.toString(),
        secondary_commission_value: rule.secondary_commission_value?.toString() || "",
        description: rule.description || "",
        is_active: rule.is_active,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bank_name || !formData.product_name || !formData.commission_value) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha banco, produto e valor da comissão.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        company_id: formData.company_id || null,
        bank_name: formData.bank_name,
        product_name: formData.product_name,
        operation_type: formData.operation_type || null,
        user_level: formData.user_level,
        calculation_model: formData.calculation_model,
        commission_type: formData.commission_type,
        commission_value: parseFloat(formData.commission_value),
        secondary_commission_value: formData.secondary_commission_value 
          ? parseFloat(formData.secondary_commission_value) 
          : null,
        description: formData.description || null,
        is_active: formData.is_active,
        created_by: user?.id,
      };

      if (editingRule) {
        const { error } = await supabase
          .from('commission_rules')
          .update(payload)
          .eq('id', editingRule.id);

        if (error) throw error;
        toast({ title: "Regra atualizada com sucesso!" });
      } else {
        const { error } = await supabase
          .from('commission_rules')
          .insert([payload]);

        if (error) throw error;
        toast({ title: "Regra criada com sucesso!" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar regra:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a regra.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta regra?")) return;

    try {
      const { error } = await supabase
        .from('commission_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Regra excluída com sucesso!" });
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a regra.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (rule: CommissionRule) => {
    try {
      const { error } = await supabase
        .from('commission_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id);

      if (error) throw error;
      toast({ 
        title: rule.is_active ? "Regra desativada" : "Regra ativada" 
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status.",
        variant: "destructive",
      });
    }
  };

  const getLevelBadge = (level: string) => {
    const config = USER_LEVELS.find(l => l.value === level);
    return (
      <Badge className={`${config?.color || 'bg-gray-500'} text-white`}>
        {config?.label || level}
      </Badge>
    );
  };

  const getCalculationModelLabel = (model: string) => {
    return CALCULATION_MODELS.find(m => m.value === model)?.label || model;
  };

  const filteredRules = rules.filter(rule => {
    const matchesSearch = 
      rule.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.company?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCompany = filterCompany === "all" || rule.company_id === filterCompany;
    const matchesLevel = filterLevel === "all" || rule.user_level === filterLevel;
    
    return matchesSearch && matchesCompany && matchesLevel;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Regras de Comissão Flexíveis
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure comissões por empresa, banco, produto e nível
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Regra
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                {editingRule ? "Editar Regra" : "Nova Regra de Comissão"}
              </DialogTitle>
              <DialogDescription>
                Configure a regra de comissionamento flexível
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              {/* Empresa */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Empresa (opcional - deixe vazio para regra global)
                </Label>
                <Select
                  value={formData.company_id || "global"}
                  onValueChange={(value) => setFormData({ ...formData, company_id: value === "global" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    <SelectItem value="global">Regra Global (todas empresas)</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Banco e Produto */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Landmark className="h-4 w-4" />
                    Banco *
                  </Label>
                  <Select
                    value={formData.bank_name}
                    onValueChange={(value) => setFormData({ ...formData, bank_name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Ou digite um novo banco"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Produto *
                  </Label>
                  <Select
                    value={formData.product_name}
                    onValueChange={(value) => setFormData({ ...formData, product_name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCTS.map((product) => (
                        <SelectItem key={product} value={product}>
                          {product}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Ou digite um novo produto"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Tipo de Operação (opcional) */}
              <div className="space-y-2">
                <Label>Tipo de Operação (opcional)</Label>
                <Input
                  placeholder="Ex: Portabilidade com Troco, Refinanciamento Simples..."
                  value={formData.operation_type}
                  onChange={(e) => setFormData({ ...formData, operation_type: e.target.value })}
                />
              </div>

              {/* Nível e Modelo de Cálculo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Nível de Comissão *
                  </Label>
                  <Select
                    value={formData.user_level}
                    onValueChange={(value) => setFormData({ ...formData, user_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${level.color}`} />
                            {level.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Modelo de Cálculo *
                  </Label>
                  <Select
                    value={formData.calculation_model}
                    onValueChange={(value) => setFormData({ ...formData, calculation_model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CALCULATION_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          <div className="flex flex-col">
                            <span>{model.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tipo e Valor da Comissão */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Tipo de Comissão
                  </Label>
                  <Select
                    value={formData.commission_type}
                    onValueChange={(value) => setFormData({ ...formData, commission_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMISSION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Valor da Comissão {formData.commission_type === 'percentage' ? '(%)' : '(R$)'} *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={formData.commission_type === 'percentage' ? "Ex: 3.5" : "Ex: 150.00"}
                    value={formData.commission_value}
                    onChange={(e) => setFormData({ ...formData, commission_value: e.target.value })}
                  />
                </div>
              </div>

              {/* Valor Secundário (para modelo "ambos") */}
              {formData.calculation_model === 'ambos' && (
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                  <Label>
                    Valor Secundário (sobre o segundo componente) 
                    {formData.commission_type === 'percentage' ? ' (%)' : ' (R$)'}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Valor adicional para modelo 'Ambos'"
                    value={formData.secondary_commission_value}
                    onChange={(e) => setFormData({ ...formData, secondary_commission_value: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Este valor será aplicado ao segundo componente do cálculo (ex: valor bruto, se o principal for saldo devedor)
                  </p>
                </div>
              )}

              {/* Descrição */}
              <div className="space-y-2">
                <Label>Descrição / Observações</Label>
                <Textarea
                  placeholder="Descrição da regra, observações..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Regra ativa</Label>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  {editingRule ? "Atualizar Regra" : "Criar Regra"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por banco, produto ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas empresas</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <Award className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos níveis</SelectItem>
                {USER_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Regras */}
      <div className="grid gap-4">
        {filteredRules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {searchTerm || filterCompany !== "all" || filterLevel !== "all"
                  ? "Nenhuma regra encontrada com os filtros selecionados."
                  : "Nenhuma regra de comissão cadastrada ainda."}
              </p>
              {!searchTerm && filterCompany === "all" && filterLevel === "all" && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => handleOpenDialog()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeira regra
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredRules.map((rule) => (
            <Card key={rule.id} className={`transition-all ${!rule.is_active ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  {/* Info Principal */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Building2 className="h-3 w-3" />
                        {rule.company?.name || "Global"}
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Landmark className="h-3 w-3" />
                        {rule.bank_name}
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Package className="h-3 w-3" />
                        {rule.product_name}
                      </Badge>
                      {getLevelBadge(rule.user_level)}
                      {!rule.is_active && (
                        <Badge variant="destructive">Inativa</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Modelo:</span>
                        <p className="font-medium">{getCalculationModelLabel(rule.calculation_model)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tipo:</span>
                        <p className="font-medium">
                          {rule.commission_type === 'percentage' ? 'Percentual' : 'Valor Fixo'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor:</span>
                        <p className="font-medium text-primary text-lg">
                          {rule.commission_type === 'percentage' 
                            ? `${rule.commission_value}%` 
                            : `R$ ${rule.commission_value.toFixed(2)}`}
                        </p>
                      </div>
                      {rule.secondary_commission_value && (
                        <div>
                          <span className="text-muted-foreground">Valor Sec.:</span>
                          <p className="font-medium">
                            {rule.commission_type === 'percentage' 
                              ? `${rule.secondary_commission_value}%` 
                              : `R$ ${rule.secondary_commission_value.toFixed(2)}`}
                          </p>
                        </div>
                      )}
                    </div>

                    {rule.description && (
                      <p className="text-sm text-muted-foreground italic">
                        {rule.description}
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex sm:flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(rule)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(rule)}
                    >
                      <Switch 
                        checked={rule.is_active} 
                        className="pointer-events-none"
                      />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(rule.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Resumo */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{rules.length}</p>
              <p className="text-sm text-muted-foreground">Total de Regras</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {rules.filter(r => r.is_active).length}
              </p>
              <p className="text-sm text-muted-foreground">Ativas</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{companies.length}</p>
              <p className="text-sm text-muted-foreground">Empresas</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {new Set(rules.map(r => r.bank_name)).size}
              </p>
              <p className="text-sm text-muted-foreground">Bancos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
