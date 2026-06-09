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

  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user, fetchLeads]);

  return { leads, stats, isLoading, fetchLeads, updateLeadStatus };
}
