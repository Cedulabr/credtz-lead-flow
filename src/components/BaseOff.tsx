import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Phone, Plus, Filter } from "lucide-react";

interface BaseOffLead {
  id: string;
  Nome: string;
  CPF: string;
  phone: string | null;
  Codigo_Banco: string;
  Valor_Parcela: string;
  UF: string;
  Municipio: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
}

export function BaseOff() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<BaseOffLead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<BaseOffLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<BaseOffLead | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [isPhoneDialogOpen, setIsPhoneDialogOpen] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [nomeFilter, setNomeFilter] = useState<string>("");
  
  // Generate list states
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedBanco, setSelectedBanco] = useState<string>("");
  const [valorParcela, setValorParcela] = useState<string>("");
  const [selectedUF, setSelectedUF] = useState<string>("");
  const [quantidadeLeads, setQuantidadeLeads] = useState<string>("10");
  const [availableBancos, setAvailableBancos] = useState<string[]>([]);
  const [availableUFs, setAvailableUFs] = useState<string[]>([]);
  const [dailyLimit, setDailyLimit] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const statusOptions = [
    { value: "novo_lead", label: "Novo Lead" },
    { value: "em_andamento", label: "Em andamento" },
    { value: "aguardando_retorno", label: "Aguardando retorno" },
    { value: "lead_fechado", label: "Lead fechado" },
    { value: "recusou_oferta", label: "Recusou oferta" },
    { value: "contato_futuro", label: "Contato Futuro" }
  ];

  useEffect(() => {
    console.log('BaseOff: Component mounted, user:', user);
    if (user) {
      initializeData();
    }
  }, [user]);

  const initializeData = async () => {
    setIsLoadingData(true);
    try {
      await Promise.all([
        fetchLeads(),
        fetchAvailableBancos(),
        fetchAvailableUFs(),
        checkDailyLimit()
      ]);
    } catch (error) {
      console.error('Error initializing data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    filterLeads();
  }, [leads, statusFilter, nomeFilter]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads_semtelefone')
        .select('*')
        .eq('assigned_to', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBancos = async () => {
    try {
      console.log('BaseOff: Fetching available bancos...');
      
      // First get allowed banks from admin settings
      const { data: allowedBanks, error: allowedError } = await supabase
        .from('baseoff_allowed_banks')
        .select('codigo_banco')
        .eq('is_active', true);

      if (allowedError) {
        console.error('Error fetching allowed banks:', allowedError);
        throw allowedError;
      }
      
      console.log('BaseOff: Allowed banks:', allowedBanks);
      const allowedCodes = allowedBanks?.map(bank => bank.codigo_banco) || [];
      
      if (allowedCodes.length === 0) {
        console.log('BaseOff: No allowed banks found');
        setAvailableBancos([]);
        return;
      }

      // Then get available leads with those bank codes
      const { data, error } = await supabase
        .from('leads_semtelefone')
        .select('Codigo_Banco')
        .eq('is_available', true)
        .or('reserved_until.is.null,reserved_until.lt.now()')
        .in('Codigo_Banco', allowedCodes);

      if (error) {
        console.error('Error fetching available leads:', error);
        throw error;
      }
      
      const uniqueBancos = [...new Set(data?.map(item => item.Codigo_Banco).filter(Boolean))];
      console.log('BaseOff: Available bancos:', uniqueBancos);
      setAvailableBancos(uniqueBancos);
    } catch (error) {
      console.error('Error fetching bancos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar bancos disponíveis",
        variant: "destructive",
      });
    }
  };

  const fetchAvailableUFs = async () => {
    try {
      const { data, error } = await supabase
        .from('leads_semtelefone')
        .select('UF')
        .eq('is_available', true)
        .or('reserved_until.is.null,reserved_until.lt.now()');

      if (error) throw error;
      
      const uniqueUFs = [...new Set(data?.map(item => item.UF).filter(Boolean))];
      setAvailableUFs(uniqueUFs);
    } catch (error) {
      console.error('Error fetching UFs:', error);
    }
  };


  const checkDailyLimit = async () => {
    try {
      const { data, error } = await supabase
        .rpc('check_baseoff_daily_limit', { user_id_param: user?.id });

      if (error) throw error;
      setDailyLimit(data || 0);
    } catch (error) {
      console.error('Error checking daily limit:', error);
    }
  };

  const filterLeads = () => {
    let filtered = leads;

    if (statusFilter !== "all") {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    if (nomeFilter.trim()) {
      filtered = filtered.filter(lead => 
        lead.Nome.toLowerCase().includes(nomeFilter.toLowerCase())
      );
    }

    setFilteredLeads(filtered);
  };

  const generateLeads = async () => {
    try {
      setIsGenerating(true);
      console.log('BaseOff: Generating leads with filters:', {
        selectedBanco,
        valorParcela,
        selectedUF,
        quantidadeLeads
      });

      const requestedLeads = parseInt(quantidadeLeads);
      const maxLeads = Math.min(requestedLeads, dailyLimit);

      // Validação dos campos obrigatórios
      if (!selectedBanco) {
        toast({
          title: "Erro",
          description: "Selecione um código de banco",
          variant: "destructive",
        });
        return;
      }

      if (!quantidadeLeads || requestedLeads <= 0) {
        toast({
          title: "Erro",
          description: "Informe uma quantidade válida de leads",
          variant: "destructive",
        });
        return;
      }

      if (maxLeads <= 0) {
        toast({
          title: "Limite atingido",
          description: "Você atingiu o limite diário de leads",
          variant: "destructive",
        });
        return;
      }

      // Construir query com filtros
      let query = supabase
        .from('leads_semtelefone')
        .select('*')
        .eq('is_available', true)
        .or('reserved_until.is.null,reserved_until.lt.now()')
        .eq('Codigo_Banco', selectedBanco);

      // Filtro por valor da parcela (se preenchido)
      if (valorParcela) {
        query = query.eq('Valor_Parcela', valorParcela);
      }

      // Filtro por UF (se selecionado)
      if (selectedUF) {
        query = query.eq('UF', selectedUF);
      }

      const { data: availableLeads, error: fetchError } = await query.limit(maxLeads);

      if (fetchError) {
        console.error('BaseOff: Error fetching leads:', fetchError);
        throw fetchError;
      }

      console.log('BaseOff: Found leads:', availableLeads?.length || 0);

      if (!availableLeads || availableLeads.length === 0) {
        toast({
          title: "Nenhum lead encontrado",
          description: "Não há leads disponíveis com esses filtros",
          variant: "destructive",
        });
        return;
      }

      // Reservar leads e atribuir ao usuário
      const leadIds = availableLeads.map(lead => lead.id);
      const reserveUntil = new Date();
      reserveUntil.setDate(reserveUntil.getDate() + 30);
      
      const { error: updateError } = await supabase
        .from('leads_semtelefone')
        .update({
          assigned_to: user?.id,
          is_available: false,
          created_by: user?.id,
          reserved_until: reserveUntil.toISOString(),
          reserved_by: user?.id
        })
        .in('id', leadIds);

      if (updateError) {
        console.error('BaseOff: Error updating leads:', updateError);
        throw updateError;
      }

      // Atualizar tracking de uso diário
      await supabase.rpc('update_daily_baseoff_usage', {
        user_id_param: user?.id,
        leads_count_param: availableLeads.length
      });

      // Registrar a solicitação
      await supabase
        .from('baseoff_requests')
        .insert({
          user_id: user?.id,
          leads_count: availableLeads.length,
          codigo_banco: selectedBanco
        });

      toast({
        title: "Sucesso",
        description: `${availableLeads.length} leads gerados com sucesso`,
      });

      setIsGenerateDialogOpen(false);
      fetchLeads();
      checkDailyLimit();
      
      // Limpar filtros
      setSelectedBanco("");
      setValorParcela("");
      setSelectedUF("");
      setQuantidadeLeads("10");
      
    } catch (error) {
      console.error('BaseOff: Error generating leads:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar leads",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads_semtelefone')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      ));

      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso",
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      });
    }
  };

  const addPhone = async () => {
    if (!selectedLead || !phoneInput.trim()) return;

    try {
      const { error } = await supabase
        .from('leads_semtelefone')
        .update({ phone: phoneInput.trim() })
        .eq('id', selectedLead.id);

      if (error) throw error;

      setLeads(leads.map(lead => 
        lead.id === selectedLead.id ? { ...lead, phone: phoneInput.trim() } : lead
      ));

      toast({
        title: "Sucesso",
        description: "Telefone adicionado com sucesso",
      });

      setIsPhoneDialogOpen(false);
      setPhoneInput("");
      setSelectedLead(null);
    } catch (error) {
      console.error('Error adding phone:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar telefone",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "novo_lead":
        return "default";
      case "em_andamento":
        return "secondary";
      case "aguardando_retorno":
        return "outline";
      case "lead_fechado":
        return "secondary";
      case "recusou_oferta":
        return "destructive";
      case "contato_futuro":
        return "outline";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.label || status;
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return '';
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  if (!user) {
    return <div className="p-6">Usuário não autenticado. Faça login para acessar o BaseOFF.</div>;
  }

  if (loading) {
    return <div className="p-6">Carregando BaseOFF...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">BaseOFF</h1>
        <div className="flex gap-4">
          <div className="text-sm text-muted-foreground">
            Limite diário restante: <strong>{dailyLimit}</strong>
          </div>
          <Button 
            onClick={() => {
              console.log('BaseOff: Gerar Lista clicked');
              console.log('BaseOff: Available bancos:', availableBancos);
              console.log('BaseOff: Available UFs:', availableUFs);
              console.log('BaseOff: User:', user);
              console.log('BaseOff: Loading data:', isLoadingData);
              
              if (!user) {
                toast({
                  title: "Erro",
                  description: "Usuário não autenticado",
                  variant: "destructive",
                });
                return;
              }
              
              if (isLoadingData) {
                toast({
                  title: "Aguarde",
                  description: "Carregando dados necessários...",
                  variant: "default",
                });
                return;
              }
              
              if (availableBancos.length === 0) {
                toast({
                  title: "Atenção",
                  description: "Nenhum banco disponível para geração de leads",
                  variant: "destructive",
                });
                return;
              }
              
              setIsGenerateDialogOpen(true);
            }}
            disabled={isLoadingData || !user || availableBancos.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isLoadingData ? "Carregando..." : "Gerar Lista"}
          </Button>
        </div>
      </div>

      {/* Generate Leads Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gerar Lista de Leads</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="banco">Código do Banco *</Label>
                  <Select value={selectedBanco} onValueChange={setSelectedBanco}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um código de banco" />
                    </SelectTrigger>
                     <SelectContent>
                       {isLoadingData ? (
                         <SelectItem value="" disabled>Carregando bancos...</SelectItem>
                       ) : availableBancos.length > 0 ? (
                         availableBancos.map(banco => (
                           <SelectItem key={banco} value={banco}>
                             Código: {banco}
                           </SelectItem>
                         ))
                       ) : (
                         <SelectItem value="" disabled>Nenhum banco disponível</SelectItem>
                       )}
                     </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="valor-parcela">Valor da Parcela</Label>
                  <Input
                    id="valor-parcela"
                    type="text"
                    placeholder="Ex: 150.00 (opcional)"
                    value={valorParcela}
                    onChange={(e) => setValorParcela(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="uf">Estado (UF)</Label>
                  <Select value={selectedUF} onValueChange={setSelectedUF}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um estado (opcional)" />
                    </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="">Todos os estados</SelectItem>
                       {isLoadingData ? (
                         <SelectItem value="" disabled>Carregando estados...</SelectItem>
                       ) : availableUFs.length > 0 ? (
                         availableUFs.map(uf => (
                           <SelectItem key={uf} value={uf}>
                             {uf}
                           </SelectItem>
                         ))
                       ) : (
                         <SelectItem value="" disabled>Nenhum estado disponível</SelectItem>
                       )}
                     </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantidade">Quantidade de Leads *</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    placeholder="10"
                    min="1"
                    max="80"
                    value={quantidadeLeads}
                    onChange={(e) => setQuantidadeLeads(e.target.value)}
                  />
                </div>

                <p className="text-sm text-muted-foreground">
                  Limite diário restante: <strong>{dailyLimit}</strong> leads
                </p>

                 <Button 
                   onClick={generateLeads} 
                   className="w-full" 
                   disabled={isGenerating || !selectedBanco || !quantidadeLeads || isLoadingData || dailyLimit <= 0}
                 >
                   {isGenerating ? "Gerando..." : isLoadingData ? "Carregando..." : "Gerar Leads"}
                 </Button>
              </div>
            </DialogContent>
        </Dialog>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="nome-filter">Nome do Cliente</Label>
              <Input
                id="nome-filter"
                type="text"
                placeholder="Digite o nome do cliente..."
                value={nomeFilter}
                onChange={(e) => setNomeFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Leads BaseOFF ({filteredLeads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Valor Parcela</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.Nome}</TableCell>
                  <TableCell>{formatCPF(lead.CPF)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {lead.phone || "Sem telefone"}
                      {!lead.phone && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLead(lead);
                            setIsPhoneDialogOpen(true);
                          }}
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{lead.Codigo_Banco}</TableCell>
                  <TableCell>R$ {lead.Valor_Parcela}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(lead.status)}>
                      {getStatusLabel(lead.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={lead.status}
                      onValueChange={(value) => updateLeadStatus(lead.id, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Phone Dialog */}
      <Dialog open={isPhoneDialogOpen} onOpenChange={setIsPhoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Telefone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
              />
            </div>
            <Button onClick={addPhone} className="w-full">
              Salvar Telefone
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}