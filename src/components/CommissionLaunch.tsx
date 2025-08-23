import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Plus, Check, X, History } from "lucide-react";

interface IndicatedLead {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  convenio: string;
  created_by: string;
  status: string;
  created_at: string;
  creator_name?: string;
  hasCommission?: boolean;
}

interface Commission {
  id: string;
  user_id: string;
  client_name: string;
  credit_value: number;
  commission_amount: number;
  commission_percentage: number;
  product_type: string;
  bank_name: string;
  status: string;
  proposal_date: string;
  payment_date?: string;
  created_at: string;
  profiles?: {
    name: string;
    email: string;
  };
}

export function CommissionLaunch() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [indicatedLeads, setIndicatedLeads] = useState<IndicatedLead[]>([]);
  const [launchedCommissions, setLaunchedCommissions] = useState<Commission[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<IndicatedLead | null>(null);
  const [commissionForm, setCommissionForm] = useState({
    credit_value: "",
    commission_percentage: "",
    product_type: "",
    bank_name: "",
    proposal_date: "",
    payment_date: ""
  });

  useEffect(() => {
    if (isAdmin) {
      fetchIndicatedLeads();
      fetchLaunchedCommissions();
    }
  }, [isAdmin]);

  const fetchIndicatedLeads = async () => {
    try {
      // Buscar leads indicados com status de oferta aprovada
      const { data: leads, error } = await supabase
        .from('leads_indicados')
        .select('*')
        .eq('status', 'oferta_aprovada')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar nomes dos criadores e verificar comissões
      const leadsWithCommissionStatus = await Promise.all(
        (leads || []).map(async (lead) => {
          // Buscar nome do criador
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', lead.created_by)
            .single();

          // Verificar se já tem comissão lançada
          const { data: existingCommission } = await supabase
            .from('commissions')
            .select('id')
            .eq('user_id', lead.created_by)
            .eq('client_name', lead.nome)
            .maybeSingle();

          return {
            ...lead,
            creator_name: profile?.name || 'Usuário desconhecido',
            hasCommission: !!existingCommission
          };
        })
      );

      setIndicatedLeads(leadsWithCommissionStatus);
    } catch (error) {
      console.error('Error fetching indicated leads:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar leads indicados",
        variant: "destructive",
      });
    }
  };

  const calculateCommissionAmount = () => {
    const creditValue = parseFloat(commissionForm.credit_value) || 0;
    const percentage = parseFloat(commissionForm.commission_percentage) || 0;
    return (creditValue * percentage) / 100;
  };

  const handleLaunchCommission = async () => {
    if (!selectedLead) return;

    try {
      const commissionAmount = calculateCommissionAmount();
      
      const commissionData = {
        user_id: selectedLead.created_by,
        client_name: selectedLead.nome,
        credit_value: parseFloat(commissionForm.credit_value),
        commission_amount: commissionAmount,
        commission_percentage: parseFloat(commissionForm.commission_percentage),
        product_type: commissionForm.product_type,
        bank_name: commissionForm.bank_name,
        status: 'pending',
        proposal_date: commissionForm.proposal_date,
        payment_date: commissionForm.payment_date || null
      };

      const { error } = await supabase
        .from('commissions')
        .insert([commissionData]);

      if (error) throw error;

      toast({
        title: "Comissão lançada!",
        description: `Comissão de R$ ${commissionAmount.toFixed(2)} lançada para ${selectedLead.nome}`,
      });

      setIsDialogOpen(false);
      setSelectedLead(null);
      setCommissionForm({
        credit_value: "",
        commission_percentage: "",
        product_type: "",
        bank_name: "",
        proposal_date: "",
        payment_date: ""
      });
      fetchIndicatedLeads();
      fetchLaunchedCommissions();
    } catch (error) {
      console.error('Error launching commission:', error);
      toast({
        title: "Erro",
        description: "Erro ao lançar comissão",
        variant: "destructive",
      });
    }
  };

  const fetchLaunchedCommissions = async () => {
    try {
      const { data: commissions, error } = await supabase
        .from('commissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar perfis dos usuários
      const userIds = [...new Set(commissions?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      // Combinar dados
      const commissionsWithProfiles = commissions?.map(commission => ({
        ...commission,
        profiles: profiles?.find(profile => profile.id === commission.user_id)
      })) || [];

      setLaunchedCommissions(commissionsWithProfiles as Commission[]);
    } catch (error) {
      console.error('Error fetching launched commissions:', error);
    }
  };

  const openCommissionDialog = (lead: IndicatedLead) => {
    setSelectedLead(lead);
    setCommissionForm({
      credit_value: "",
      commission_percentage: "3.5",
      product_type: "Consignado",
      bank_name: "",
      proposal_date: new Date().toISOString().split('T')[0],
      payment_date: ""
    });
    setIsDialogOpen(true);
  };

  if (!isAdmin) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gerenciar Comissões de Indicações</h2>
          <p className="text-muted-foreground">
            Gerencie as comissões dos leads indicados aprovados
          </p>
        </div>
      </div>

      <Tabs defaultValue="launch" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="launch">Lançar Comissões</TabsTrigger>
          <TabsTrigger value="launched">Comissões Lançadas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="launch" className="space-y-4">
          <div className="grid gap-4">
            {indicatedLeads.map((lead) => (
          <Card key={lead.id} className={lead.hasCommission ? "bg-muted/50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-semibold">{lead.nome}</h3>
                      <p className="text-sm text-muted-foreground">
                        Indicado por: {lead.creator_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        CPF: {lead.cpf} | Convênio: {lead.convenio}
                      </p>
                       <p className="text-xs text-muted-foreground">
                         Aprovado em: {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                       </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {lead.hasCommission ? (
                    <div className="flex items-center gap-2 text-success">
                      <Check className="h-4 w-4" />
                      <span className="text-sm">Comissão Lançada</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => openCommissionDialog(lead)}
                      className="flex items-center gap-2"
                    >
                      <DollarSign className="h-4 w-4" />
                      Lançar Comissão
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

            {indicatedLeads.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    Nenhum lead indicado com oferta aprovada encontrado
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="launched" className="space-y-4">
          <div className="grid gap-4">
            {launchedCommissions.map((commission) => (
              <Card key={commission.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-semibold">{commission.client_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Indicado por: {commission.profiles?.name || 'Usuário desconhecido'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Banco: {commission.bank_name} | Produto: {commission.product_type}
                          </p>
                          <p className="text-sm font-medium text-primary">
                            Comissão: R$ {commission.commission_amount.toFixed(2)} ({commission.commission_percentage}%)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Lançada em: {new Date(commission.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={
                        commission.status === 'paid' ? 'default' : 
                        commission.status === 'pending' ? 'secondary' : 'outline'
                      }>
                        {commission.status === 'paid' ? 'Pago' : 
                         commission.status === 'pending' ? 'Pendente' : 'Prévia'}
                      </Badge>
                      <History className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {launchedCommissions.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    Nenhuma comissão lançada encontrada
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lançar Comissão - {selectedLead?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="credit_value">Valor do Crédito (R$)</Label>
                <Input
                  id="credit_value"
                  type="number"
                  step="0.01"
                  value={commissionForm.credit_value}
                  onChange={(e) => setCommissionForm({ ...commissionForm, credit_value: e.target.value })}
                  placeholder="Ex: 15000.00"
                />
              </div>
              <div>
                <Label htmlFor="commission_percentage">Percentual de Comissão (%)</Label>
                <Input
                  id="commission_percentage"
                  type="number"
                  step="0.01"
                  value={commissionForm.commission_percentage}
                  onChange={(e) => setCommissionForm({ ...commissionForm, commission_percentage: e.target.value })}
                  placeholder="Ex: 3.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product_type">Tipo de Produto</Label>
                <Select value={commissionForm.product_type} onValueChange={(value) => 
                  setCommissionForm({ ...commissionForm, product_type: value })
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consignado">Consignado</SelectItem>
                    <SelectItem value="Pessoal">Empréstimo Pessoal</SelectItem>
                    <SelectItem value="Cartão">Cartão de Crédito</SelectItem>
                    <SelectItem value="Refinanciamento">Refinanciamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bank_name">Banco</Label>
                <Input
                  id="bank_name"
                  value={commissionForm.bank_name}
                  onChange={(e) => setCommissionForm({ ...commissionForm, bank_name: e.target.value })}
                  placeholder="Ex: C6, BMG, PAN"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="proposal_date">Data da Proposta</Label>
                <Input
                  id="proposal_date"
                  type="date"
                  value={commissionForm.proposal_date}
                  onChange={(e) => setCommissionForm({ ...commissionForm, proposal_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="payment_date">Data do Pagamento (Opcional)</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={commissionForm.payment_date}
                  onChange={(e) => setCommissionForm({ ...commissionForm, payment_date: e.target.value })}
                />
              </div>
            </div>

            {commissionForm.credit_value && commissionForm.commission_percentage && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  Valor da Comissão: R$ {calculateCommissionAmount().toFixed(2)}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleLaunchCommission} className="flex-1">
                <DollarSign className="h-4 w-4 mr-2" />
                Lançar Comissão
              </Button>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}