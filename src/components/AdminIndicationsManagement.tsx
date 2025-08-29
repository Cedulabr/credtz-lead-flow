import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MessageCircle, Users, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface IndicatedLead {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  convenio: string;
  status: string;
  observacoes?: string;
  created_at: string;
  created_by: string;
  creator_name?: string;
}

const AdminIndicationsManagement = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<IndicatedLead[]>([]);
  const [loading, setLoading] = useState(true);

  const statusOptions = [
    { value: 'lead_digitado', label: 'Lead Digitado', color: 'bg-blue-500' },
    { value: 'oferta_aprovada', label: 'Oferta Aprovada', color: 'bg-green-500' },
    { value: 'oferta_recusada', label: 'Oferta Recusada', color: 'bg-red-500' },
    { value: 'oferta_paga', label: 'Oferta Paga', color: 'bg-purple-500' }
  ];

  useEffect(() => {
    if (isAdmin) {
      fetchAllIndicatedLeads();
    }
  }, [isAdmin]);

  const fetchAllIndicatedLeads = async () => {
    try {
      setLoading(true);
      
      // Buscar todos os leads indicados
      const { data: leadsData, error } = await supabase
        .from('leads_indicados')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar leads indicados:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar leads indicados",
          variant: "destructive",
        });
        return;
      }

      // Buscar nomes dos criadores
      const userIds = [...new Set(leadsData?.map(lead => lead.created_by) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      // Combinar dados
      const leadsWithCreators = leadsData?.map(lead => ({
        ...lead,
        creator_name: profiles?.find(profile => profile.id === lead.created_by)?.name || 'Usuário desconhecido'
      })) || [];

      setLeads(leadsWithCreators);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar leads indicados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads_indicados')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar status do lead",
          variant: "destructive",
        });
        return;
      }

      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        )
      );

      toast({
        title: "Status atualizado",
        description: "Status do lead atualizado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do lead",
        variant: "destructive",
      });
    }
  };

  const getStatusInfo = (status: string) => {
    const statusInfo = statusOptions.find(opt => opt.value === status);
    return statusInfo || { label: status, color: 'bg-gray-500' };
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${phoneWithCountry}`, '_blank');
  };

  if (!isAdmin) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Carregando indicações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gerir Indicações
        </CardTitle>
        <CardDescription>
          Gerencie o status de todas as indicações de leads dos usuários
        </CardDescription>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhuma indicação encontrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Indicador</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Convênio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => {
                  const statusInfo = getStatusInfo(lead.status);
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.nome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lead.creator_name}
                      </TableCell>
                      <TableCell>{formatCPF(lead.cpf)}</TableCell>
                      <TableCell>{formatPhone(lead.telefone)}</TableCell>
                      <TableCell>{lead.convenio}</TableCell>
                      <TableCell>
                        <Select
                          value={lead.status}
                          onValueChange={(newStatus) => updateLeadStatus(lead.id, newStatus)}
                        >
                          <SelectTrigger className="w-[160px]">
                            <Badge className={`${statusInfo.color} text-white`}>
                              {statusInfo.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`tel:${lead.telefone}`, '_self')}
                            title="Ligar"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openWhatsApp(lead.telefone)}
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminIndicationsManagement;