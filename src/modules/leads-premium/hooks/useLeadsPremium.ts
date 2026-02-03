import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lead, UserProfile, LeadStats, PIPELINE_STAGES } from "../types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function useLeadsPremium() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userCredits, setUserCredits] = useState(0);

  const isAdmin = profile?.role === 'admin';

  // Calculate stats from leads
  const stats = useMemo<LeadStats>(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());

    const todayLeads = leads.filter(l => new Date(l.created_at) >= today);
    const weekLeads = leads.filter(l => new Date(l.created_at) >= thisWeekStart);

    const statusCounts = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const converted = statusCounts['cliente_fechado'] || 0;
    const conversionRate = leads.length > 0 ? (converted / leads.length) * 100 : 0;

    // Calculate average time to conversion (in hours)
    const convertedLeads = leads.filter(l => l.status === 'cliente_fechado' && l.updated_at);
    const avgTimeToConversion = convertedLeads.length > 0
      ? convertedLeads.reduce((acc, l) => {
          const created = new Date(l.created_at).getTime();
          const updated = new Date(l.updated_at!).getTime();
          return acc + (updated - created) / (1000 * 60 * 60);
        }, 0) / convertedLeads.length
      : 0;

    return {
      total: leads.length,
      novos: statusCounts['new_lead'] || 0,
      emAndamento: (statusCounts['em_andamento'] || 0) + (statusCounts['aguardando_retorno'] || 0),
      fechados: converted,
      recusados: (statusCounts['recusou_oferta'] || 0) + (statusCounts['sem_interesse'] || 0),
      pendentes: (statusCounts['agendamento'] || 0) + (statusCounts['contato_futuro'] || 0),
      conversionRate,
      avgTimeToConversion,
      todayCount: todayLeads.length,
      weekCount: weekLeads.length,
      byStatus: statusCounts
    };
  }, [leads]);

  const fetchLeads = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
      }

      const { data, error } = await query;
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
      setIsLoading(false);
    }
  }, [user, isAdmin, toast]);

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  const fetchUserCredits = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_user_credits', { target_user_id: user.id });

      if (error) throw error;
      setUserCredits(data || 0);
    } catch (error) {
      console.error('Error fetching user credits:', error);
      setUserCredits(0);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchLeads();
      fetchUserCredits();
      fetchUsers();
    }
  }, [user, fetchLeads, fetchUserCredits, fetchUsers]);

  const updateLeadStatus = useCallback(async (
    leadId: string, 
    newStatus: string, 
    additionalData?: Partial<Lead>
  ): Promise<boolean> => {
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return false;

      const historyEntry = {
        action: 'status_change',
        timestamp: new Date().toISOString(),
        user_id: user?.id,
        user_name: profile?.name || user?.email,
        from_status: lead.status,
        to_status: newStatus
      };

      const currentHistory = lead.history ? 
        (typeof lead.history === 'string' ? JSON.parse(lead.history) : lead.history) : [];

      const { error } = await supabase
        .from('leads')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          history: JSON.stringify([...currentHistory, historyEntry]),
          ...additionalData
        })
        .eq('id', leadId);

      if (error) throw error;

      // Handle special status: cliente_fechado -> create proposta
      if (newStatus === 'cliente_fechado') {
        await handleClienteFechado(lead);
      }

      toast({
        title: "Status atualizado",
        description: `Lead atualizado para "${PIPELINE_STAGES[newStatus]?.label || newStatus}"`,
      });

      fetchLeads();
      return true;
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar lead",
        variant: "destructive",
      });
      return false;
    }
  }, [user, profile, leads, toast, fetchLeads]);

  const handleClienteFechado = async (lead: Lead) => {
    try {
      const { data: userCompanies } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .limit(1);

      const companyId = userCompanies?.[0]?.company_id || null;

      await supabase
        .from('propostas')
        .insert({
          "Nome do cliente": lead.name,
          cpf: lead.cpf,
          telefone: lead.phone,
          convenio: lead.convenio,
          pipeline_stage: "contato_iniciado",
          client_status: "cliente_intencionado",
          origem_lead: "leads_premium",
          created_by_id: user?.id,
          assigned_to: user?.id,
          company_id: companyId,
          notes: `Convertido de Leads Premium em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
        });
    } catch (error) {
      console.error('Error creating proposta:', error);
    }
  };

  const requestLeads = useCallback(async (options: {
    convenio?: string;
    count: number;
    ddds?: string[];
    tags?: string[];
  }): Promise<boolean> => {
    if (!user) return false;

    if (userCredits <= 0) {
      toast({
        title: "Sem créditos",
        description: "Seus créditos acabaram. Solicite ao administrador.",
        variant: "destructive",
      });
      return false;
    }

    if (options.count > userCredits) {
      toast({
        title: "Créditos insuficientes",
        description: `Você só possui ${userCredits} créditos.`,
        variant: "destructive",
      });
      return false;
    }

    try {
      const { data, error } = await supabase
        .rpc('request_leads_with_credits', {
          convenio_filter: options.convenio || null,
          banco_filter: null,
          produto_filter: null,
          leads_requested: options.count,
          ddd_filter: options.ddds?.length ? options.ddds : null,
          tag_filter: options.tags?.length ? options.tags : null
        });

      if (error) throw error;

      if (data?.length > 0) {
        const requestedAt = new Date().toISOString();
        const leadsToInsert = data.map((lead: any) => ({
          name: lead.name,
          cpf: lead.cpf ?? '',
          phone: lead.phone,
          phone2: lead.phone2 || null,
          convenio: lead.convenio,
          tag: lead.tag || null,
          status: 'new_lead',
          created_by: user.id,
          assigned_to: user.id,
          origem_lead: 'Sistema - Solicitação',
          banco_operacao: lead.banco,
          requested_at: requestedAt,
          requested_by: user.id,
          history: JSON.stringify([{
            action: 'created',
            timestamp: requestedAt,
            user_id: user.id,
            user_name: profile?.name || user?.email,
            note: 'Lead solicitado do sistema'
          }])
        }));

        await supabase.from('leads').insert(leadsToInsert);

        toast({
          title: "Leads solicitados!",
          description: `${data.length} leads adicionados.`,
        });

        fetchLeads();
        fetchUserCredits();
        return true;
      } else {
        toast({
          title: "Nenhum lead encontrado",
          description: "Não há leads disponíveis com esses filtros.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error('Error requesting leads:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao solicitar leads",
        variant: "destructive",
      });
      return false;
    }
  }, [user, profile, userCredits, toast, fetchLeads, fetchUserCredits]);

  const canEditLead = useCallback((lead: Lead): boolean => {
    if (isAdmin) return true;
    return lead.assigned_to === user?.id || lead.created_by === user?.id;
  }, [isAdmin, user]);

  return {
    leads,
    users,
    isLoading,
    userCredits,
    stats,
    fetchLeads,
    updateLeadStatus,
    requestLeads,
    canEditLead
  };
}
