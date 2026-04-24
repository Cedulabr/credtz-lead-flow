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
  const [companyUserIds, setCompanyUserIds] = useState<string[]>([]);
  const [isGestor, setIsGestor] = useState(false);

  const isAdmin = profile?.role === 'admin';

  // Fetch company info and user IDs for gestor filtering
  useEffect(() => {
    if (!user || isAdmin) return;

    const fetchCompanyInfo = async () => {
      // Check if user is gestor
      const { data: uc } = await supabase
        .from('user_companies')
        .select('company_id, company_role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!uc) return;

      const gestorRole = uc.company_role === 'gestor';
      setIsGestor(gestorRole);

      if (gestorRole && uc.company_id) {
        // Fetch all user IDs belonging to this company
        const { data: companyUsers } = await supabase
          .from('user_companies')
          .select('user_id')
          .eq('company_id', uc.company_id)
          .eq('is_active', true);
        setCompanyUserIds((companyUsers || []).map(u => u.user_id));
      }
    };

    fetchCompanyInfo();
  }, [user, isAdmin]);

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
        .select('id, name, cpf, phone, phone2, convenio, tag, status, created_at, updated_at, assigned_to, created_by, is_rework, notes, future_contact_date, rejection_reason, banco_operacao, valor_operacao, history, simulation_status, simulation_id')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!isAdmin) {
        if (isGestor && companyUserIds.length > 0) {
          // Gestor: see all leads from company users
          query = query.or(`assigned_to.in.(${companyUserIds.join(',')}),created_by.in.(${companyUserIds.join(',')})`);
        } else {
          // Colaborador: see only own leads
          query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
        }
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
  }, [user, isAdmin, isGestor, companyUserIds, toast]);

  const fetchUsers = useCallback(async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('id, name, email')
        .eq('is_active', true)
        .order('name');

      // Gestor: only show company users
      if (!isAdmin && isGestor && companyUserIds.length > 0) {
        query = query.in('id', companyUserIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [isAdmin, isGestor, companyUserIds]);

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

      // For sem_interesse: use 60-day blacklist; for sem_possibilidade: 30-day
      const blacklistStatuses = ['sem_interesse', 'sem_possibilidade', 'recusou_oferta'];
      if (blacklistStatuses.includes(newStatus) && lead.cpf) {
        const durationDays = newStatus === 'sem_interesse' ? 60 : 30;
        await supabase.rpc('blacklist_lead_with_duration', {
          lead_id_param: leadId,
          lead_cpf: lead.cpf,
          reason_param: newStatus,
          duration_days: durationDays,
        });
        // Also update history
        const { error: histError } = await supabase
          .from('leads')
          .update({
            history: JSON.stringify([...currentHistory, historyEntry]),
          })
          .eq('id', leadId);
        if (histError) throw histError;
      } else {
        const updateData: any = {
          status: newStatus,
          updated_at: new Date().toISOString(),
          history: JSON.stringify([...currentHistory, historyEntry]),
          ...additionalData
        };
        // Mark as treated when moving from new_lead
        if (lead.status === 'new_lead' && newStatus !== 'new_lead') {
          updateData.treated_at = new Date().toISOString();
          updateData.treatment_status = 'treated';
        }
        const { error } = await supabase
          .from('leads')
          .update(updateData)
          .eq('id', leadId);
        if (error) throw error;
      }

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
    banco?: string | null;
    parcelaMin?: number | null;
    parcelaMax?: number | null;
    margemMin?: number | null;
    parcelasPagasMin?: number | null;
    requireTelefone?: boolean | null;
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
          banco_filter: options.banco || null,
          produto_filter: null,
          leads_requested: options.count,
          ddd_filter: options.ddds?.length ? options.ddds : null,
          tag_filter: options.tags?.length ? options.tags : null,
          parcela_min: options.parcelaMin ?? null,
          parcela_max: options.parcelaMax ?? null,
          margem_min: options.margemMin ?? null,
        } as any);

      if (error) throw error;

      // Filtro client-side: leads com telefone (se solicitado)
      let filtered = data || [];
      if (options.requireTelefone === true) {
        filtered = filtered.filter((l: any) => {
          const digits = String(l.phone || '').replace(/\D/g, '');
          return digits.length >= 10;
        });
      }

      if (filtered?.length > 0) {
        const data = filtered;
        const requestedAt = new Date().toISOString();
        const deadlineDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
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
          withdrawn_at: requestedAt,
          treatment_deadline: deadlineDate,
          treatment_status: 'pending',
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
    if (isGestor && companyUserIds.length > 0) {
      return companyUserIds.includes(lead.assigned_to || '') || companyUserIds.includes(lead.created_by || '');
    }
    return lead.assigned_to === user?.id || lead.created_by === user?.id;
  }, [isAdmin, isGestor, companyUserIds, user]);

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
