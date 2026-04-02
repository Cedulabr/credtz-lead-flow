import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface OverdueLead {
  id: string;
  name: string;
  phone: string;
  withdrawn_at: string;
  treatment_deadline: string;
  status: string;
  hoursOverdue: number;
}

export function useOverdueLeads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [overdueLeads, setOverdueLeads] = useState<OverdueLead[]>([]);
  const [warningLeads, setWarningLeads] = useState<OverdueLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOverdueLeads = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const now = new Date();

      // Fetch all leads with pending treatment for this user
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, phone, withdrawn_at, treatment_deadline, status, treatment_status')
        .eq('assigned_to', user.id)
        .eq('treatment_status', 'pending')
        .not('treatment_deadline', 'is', null)
        .order('treatment_deadline', { ascending: true });

      if (error) throw error;

      const overdue: OverdueLead[] = [];
      const warnings: OverdueLead[] = [];

      (data || []).forEach((lead: any) => {
        const deadline = new Date(lead.treatment_deadline);
        const withdrawnAt = new Date(lead.withdrawn_at);
        const hoursElapsed = (now.getTime() - withdrawnAt.getTime()) / (1000 * 60 * 60);
        const hoursOverdue = (now.getTime() - deadline.getTime()) / (1000 * 60 * 60);

        const item: OverdueLead = {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          withdrawn_at: lead.withdrawn_at,
          treatment_deadline: lead.treatment_deadline,
          status: lead.status,
          hoursOverdue: Math.max(0, hoursOverdue),
        };

        if (now > deadline) {
          // Already overdue (48h+)
          overdue.push(item);
        } else if (hoursElapsed >= 24) {
          // Warning zone (24h-48h)
          warnings.push(item);
        }
      });

      setOverdueLeads(overdue);
      setWarningLeads(warnings);

      // Progressive toasts
      if (warnings.length > 0 && overdue.length === 0) {
        const criticalWarnings = warnings.filter(l => {
          const elapsed = (now.getTime() - new Date(l.withdrawn_at).getTime()) / (1000 * 60 * 60);
          return elapsed >= 36;
        });

        if (criticalWarnings.length > 0) {
          toast({
            title: "⚠️ Alerta Crítico!",
            description: `${criticalWarnings.length} lead(s) vencem em menos de 12h. Trate-os agora!`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "⏰ Leads pendentes",
            description: `${warnings.length} lead(s) precisam ser tratados nas próximas 24h.`,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching overdue leads:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchOverdueLeads();
    const interval = setInterval(fetchOverdueLeads, 60000); // Poll every 60s
    return () => clearInterval(interval);
  }, [fetchOverdueLeads]);

  return {
    overdueLeads,
    warningLeads,
    hasOverdue: overdueLeads.length > 0,
    isBlocked: overdueLeads.length > 0,
    isLoading,
    refetch: fetchOverdueLeads,
  };
}
