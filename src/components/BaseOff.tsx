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
  const [valorMin, setValorMin] = useState<string>("100");
  const [valorMax, setValorMax] = useState<string>("1500");
  const [idadeMin, setIdadeMin] = useState<string>("45");
  const [idadeMax, setIdadeMax] = useState<string>("71");
  const [selectedUF, setSelectedUF] = useState<string>("");
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>("");
  const [quantidadeLeads, setQuantidadeLeads] = useState<string>("50");
  const [availableBancos, setAvailableBancos] = useState<string[]>([]);
  const [availableUFs, setAvailableUFs] = useState<string[]>([]);
  const [availableMunicipios, setAvailableMunicipios] = useState<string[]>([]);
  const [dailyLimit, setDailyLimit] = useState<number>(0);

  const statusOptions = [
    { value: "novo_lead", label: "Novo Lead" },
    { value: "em_andamento", label: "Em andamento" },
    { value: "aguardando_retorno", label: "Aguardando retorno" },
    { value: "lead_fechado", label: "Lead fechado" },
    { value: "recusou_oferta", label: "Recusou oferta" },
    { value: "contato_futuro", label: "Contato Futuro" }
  ];

  useEffect(() => {
    fetchLeads();
    fetchAvailableBancos();
    fetchAvailableUFs();
    checkDailyLimit();
  }, []);

  useEffect(() => {
    if (selectedUF) {
      fetchAvailableMunicipios();
    } else {
      setAvailableMunicipios([]);
      setSelectedMunicipio("");
    }
  }, [selectedUF]);

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
      // First get allowed banks from admin settings
      const { data: allowedBanks, error: allowedError } = await supabase
        .from('baseoff_allowed_banks')
        .select('codigo_banco')
        .eq('is_active', true);

      if (allowedError) throw allowedError;
      
      const allowedCodes = allowedBanks?.map(bank => bank.codigo_banco) || [];
      
      if (allowedCodes.length === 0) {
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

      if (error) throw error;
      
      const uniqueBancos = [...new Set(data?.map(item => item.Codigo_Banco).filter(Boolean))];
      setAvailableBancos(uniqueBancos);
    } catch (error) {
      console.error('Error fetching bancos:', error);
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

  const fetchAvailableMunicipios = async () => {
    try {
      const { data, error } = await supabase
        .from('leads_semtelefone')
        .select('Municipio')
        .eq('is_available', true)
        .eq('UF', selectedUF)
        .or('reserved_until.is.null,reserved_until.lt.now()');

      if (error) throw error;
      
      const uniqueMunicipios = [...new Set(data?.map(item => item.Municipio).filter(Boolean))];
      setAvailableMunicipios(uniqueMunicipios);
    } catch (error) {
      console.error('Error fetching municípios:', error);
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
      const requestedLeads = parseInt(quantidadeLeads);
      const maxLeads = Math.min(requestedLeads, dailyLimit);

      if (!selectedBanco || !valorMin || !valorMax) {
        toast({
          title: "Erro",
          description: "Preencha todos os filtros obrigatórios",
          variant: "destructive",
        });
        return;
      }

      if (maxLeads <= 0) {
        toast({
          title: "Limite atingido",
          description: "Você atingiu o limite diário de 80 leads",
          variant: "destructive",
        });
        return;
      }

      // Check if bank is allowed first
      const { data: allowedBank, error: bankError } = await supabase
        .from('baseoff_allowed_banks')
        .select('codigo_banco')
        .eq('codigo_banco', selectedBanco)
        .eq('is_active', true)
        .single();

      if (bankError || !allowedBank) {
        toast({
          title: "Banco não permitido",
          description: "Este banco não está disponível para geração de leads",
          variant: "destructive",
        });
        return;
      }

      // Build query with filters
      let query = supabase
        .from('leads_semtelefone')
        .select('*')
        .eq('is_available', true)
        .or('reserved_until.is.null,reserved_until.lt.now()')
        .eq('Codigo_Banco', selectedBanco)
        .gte('Valor_Parcela', valorMin)
        .lte('Valor_Parcela', valorMax);

      // Add UF filter if selected
      if (selectedUF) {
        query = query.eq('UF', selectedUF);
      }

      // Add Municipio filter if selected
      if (selectedMunicipio) {
        query = query.eq('Municipio', selectedMunicipio);
      }

      const { data: availableLeads, error: fetchError } = await query.limit(maxLeads);

      if (fetchError) throw fetchError;

      if (!availableLeads || availableLeads.length === 0) {
        toast({
          title: "Nenhum lead encontrado",
          description: "Não há leads disponíveis com esses filtros",
          variant: "destructive",
        });
        return;
      }

      // Reserve leads for 30 days and assign to user
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

      if (updateError) throw updateError;

      // Update daily usage tracking
      await supabase.rpc('update_daily_baseoff_usage', {
        user_id_param: user?.id,
        leads_count_param: availableLeads.length
      });

      // Record the request
      await supabase
        .from('baseoff_requests')
        .insert({
          user_id: user?.id,
          leads_count: availableLeads.length,
          codigo_banco: selectedBanco,
          valor_parcela_min: parseFloat(valorMin),
          valor_parcela_max: parseFloat(valorMax)
        });

      toast({
        title: "Sucesso",
        description: `${availableLeads.length} leads gerados com sucesso`,
      });

      setIsGenerateDialogOpen(false);
      fetchLeads();
      checkDailyLimit();
    } catch (error) {
      console.error('Error generating leads:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar leads",
        variant: "destructive",
      });
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

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">BaseOFF</h1>
        <div className="flex gap-4">
          <div className="text-sm text-muted-foreground">
            Limite diário restante: <strong>{dailyLimit}</strong>
          </div>
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                console.log('Gerar Lista clicked, opening dialog');
                setIsGenerateDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Gerar Lista
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gerar Lista de Leads</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="banco">Código do Banco</Label>
                  <Select value={selectedBanco} onValueChange={setSelectedBanco}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBancos.map(banco => (
                        <SelectItem key={banco} value={banco}>
                          {banco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                 <div>
                   <Label htmlFor="quantidade">Quantidade de Leads</Label>
                   <Input
                     id="quantidade"
                     type="number"
                     placeholder="50"
                     min="1"
                     max="80"
                     value={quantidadeLeads}
                     onChange={(e) => setQuantidadeLeads(e.target.value)}
                   />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <Label htmlFor="valor-min">Valor Mínimo da Parcela</Label>
                     <Input
                       id="valor-min"
                       type="number"
                       placeholder="100"
                       value={valorMin}
                       onChange={(e) => setValorMin(e.target.value)}
                     />
                   </div>
                   <div>
                     <Label htmlFor="valor-max">Valor Máximo da Parcela</Label>
                     <Input
                       id="valor-max"
                       type="number"
                       placeholder="1500"
                       value={valorMax}
                       onChange={(e) => setValorMax(e.target.value)}
                     />
                   </div>
                 </div>

                  <div>
                    <Label htmlFor="uf">Estado (UF)</Label>
                    <Select value={selectedUF} onValueChange={setSelectedUF}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um estado (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos os estados</SelectItem>
                        {availableUFs.map(uf => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedUF && (
                    <div>
                      <Label htmlFor="municipio">Cidade</Label>
                      <Select value={selectedMunicipio} onValueChange={setSelectedMunicipio}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma cidade (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todas as cidades</SelectItem>
                          {availableMunicipios.map(municipio => (
                            <SelectItem key={municipio} value={municipio}>
                              {municipio}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}


                 <p className="text-sm text-muted-foreground">
                   Máximo: 80 leads por dia. Restante hoje: <strong>{dailyLimit}</strong>
                 </p>

                <Button onClick={generateLeads} className="w-full">
                  Gerar Leads
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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