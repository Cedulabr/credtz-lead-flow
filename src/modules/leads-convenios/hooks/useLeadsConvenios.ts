import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lead, UserProfile, LeadStats, PIPELINE_STAGES } from "../../leads-premium/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function useLeadsConvenios() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [companyUserIds, setCompanyUserIds] = useState<string[]>([]);
  const [isGestor, setIsGestor] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!user || isAdmin) return;
    const fetchCompanyInfo = async () => {
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

  const stats = useMemo<LeadStats>(() => {
    const statusCounts = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: leads.length,
      novos: statusCounts['new_lead'] || 0,
      emAndamento: (statusCounts['em_andamento'] || 0) + (statusCounts['aguardando_retorno'] || 0),
      fechados: statusCounts['cliente_fechado'] || 0,
      recusados: (statusCounts['recusou_oferta'] || 0) + (statusCounts['sem_interesse'] || 0),
      pendentes: (statusCounts['agendamento'] || 0) + (statusCounts['contato_futuro'] || 0),
      conversionRate: leads.length > 0 ? ((statusCounts['cliente_fechado'] || 0) / leads.length) * 100 : 0,
      avgTimeToConversion: 0,
      todayCount: 0,
      weekCount: 0,
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
        .eq('origem_lead', 'leads_convenios')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!isAdmin) {
        if (isGestor && companyUserIds.length > 0) {
          query = query.or(`assigned_to.in.(${companyUserIds.join(',')}),created_by.in.(${companyUserIds.join(',')})`);
        } else {
          query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setLeads((data as any) || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({ title: "Erro", description: "Erro ao carregar leads", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin, isGestor, companyUserIds, toast]);

  const updateLeadStatus = useCallback(async (leadId: string, newStatus: string, additionalData?: Partial<Lead>): Promise<boolean> => {
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

      const currentHistory = lead.history ? (typeof lead.history === 'string' ? JSON.parse(lead.history) : lead.history) : [];

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
      
      toast({ title: "Status atualizado", description: `Lead atualizado para "${PIPELINE_STAGES[newStatus]?.label || newStatus}"` });
      fetchLeads();
      return true;
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: "Erro", description: "Erro ao atualizar lead", variant: "destructive" });
      return false;
    }
  }, [user, profile, leads, toast, fetchLeads]);

  const fetchUserCredits = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_user_credits', { target_user_id: user.id });
      if (error) throw error;
      setUserCredits(data || 0);
    } catch (error) {
      console.error('Error fetching user credits:', error);
      setUserCredits(0);
    }
  }, [user]);

  const requestLeads = useCallback(async (options: {
    convenio?: string;
    count: number;
    ddds?: string[];
    tags?: string[];
    banco?: string | null;
    parcelaMin?: number | null;
    parcelaMax?: number | null;
    margemMin?: number | null;
    margemMax?: number | null;
    parcelasPagasMin?: number | null;
    parcelasPagasMax?: number | null;
  }): Promise<boolean> => {
    if (!user) return false;
    if (userCredits <= 0) {
      toast({ title: "Sem créditos", description: "Seus créditos acabaram.", variant: "destructive" });
      return false;
    }
    try {
      const { data: filtered, error } = await supabase.rpc('request_leads_with_credits', {
        convenio_filter: 'GOV BA',
        banco_filter: options.banco || null,
        leads_requested: options.count,
        ddd_filter: options.ddds?.length ? options.ddds : null,
        tag_filter: options.tags?.length ? options.tags : null,
        parcela_min: options.parcelaMin ?? null,
        parcela_max: options.parcelaMax ?? null,
        margem_min: options.margemMin ?? null,
        margem_max: options.margemMax ?? null,
        parcelas_pagas_min: options.parcelasPagasMin ?? null,
        parcelas_pagas_max: options.parcelasPagasMax ?? null,
      } as any);

      if (error) throw error;

      if (filtered?.length > 0) {
        const requestedAt = new Date().toISOString();
        const leadsToInsert = filtered.map((lead: any) => ({
          name: lead.name,
          cpf: lead.cpf ?? '',
          phone: lead.phone,
          phone2: lead.phone2 || null,
          convenio: lead.convenio,
          tag: lead.tag || null,
          status: 'new_lead',
          created_by: user.id,
          assigned_to: user.id,
          origem_lead: 'leads_convenios',
          banco_operacao: lead.banco,
          matricula: lead.matricula,
          emprestimos: lead.emprestimos,
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
        toast({ title: "Leads solicitados!", description: `${filtered.length} leads adicionados.` });
        fetchLeads();
        fetchUserCredits();
        return true;
      }
      return false;
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao solicitar leads", variant: "destructive" });
      return false;
    }
  }, [user, profile, userCredits, toast, fetchLeads, fetchUserCredits]);

  useEffect(() => {
    if (user) {
      fetchLeads();
      fetchUserCredits();
    }
  }, [user, fetchLeads, fetchUserCredits]);

  return { leads, stats, isLoading, userCredits, fetchLeads, updateLeadStatus, requestLeads };
}
