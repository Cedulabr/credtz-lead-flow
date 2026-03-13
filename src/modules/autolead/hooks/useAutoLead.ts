import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { AutoLeadJob, AutoLeadMessage, WizardData } from "../types";
import { DEFAULT_MESSAGE } from "../types";

export function useAutoLead() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<AutoLeadJob[]>([]);
  const [activeJob, setActiveJob] = useState<AutoLeadJob | null>(null);
  const [messages, setMessages] = useState<AutoLeadMessage[]>([]);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase.rpc("get_user_credits", { target_user_id: user.id });
    setCredits(data ?? 0);
  }, [user?.id]);

  const fetchJobs = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("autolead_jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setJobs(data || []);
    const active = (data || []).find((j: AutoLeadJob) => j.status === "running" || j.status === "paused");
    setActiveJob(active || null);
    setLoading(false);
  }, [user?.id]);

  const fetchMessages = useCallback(async (jobId: string) => {
    const { data } = await (supabase as any)
      .from("autolead_messages")
      .select("*")
      .eq("job_id", jobId)
      .order("scheduled_at", { ascending: true });
    setMessages(data || []);
  }, []);

  useEffect(() => {
    fetchCredits();
    fetchJobs();
  }, [fetchCredits, fetchJobs]);

  // Realtime subscription for active job messages
  useEffect(() => {
    if (!activeJob) return;
    const channel = supabase
      .channel(`autolead-messages-${activeJob.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "autolead_messages", filter: `job_id=eq.${activeJob.id}` },
        () => {
          fetchMessages(activeJob.id);
          fetchJobs();
        }
      )
      .subscribe();

    fetchMessages(activeJob.id);
    return () => { supabase.removeChannel(channel); };
  }, [activeJob?.id, fetchMessages, fetchJobs]);

  const createJob = useCallback(async (wizardData: WizardData): Promise<string | null> => {
    if (!user?.id) return null;

    // Get company_id
    const { data: ucData } = await supabase
      .from("user_companies")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    // 1. Request leads via existing RPC
    const { data: leads, error: leadsError } = await supabase.rpc(
      "request_leads_with_credits" as any,
      {
        leads_requested: wizardData.quantidade,
        ddd_filter: wizardData.ddds.length > 0 ? wizardData.ddds : null,
        convenio_filter: wizardData.tipoLead === "todos" ? null : wizardData.tipoLead,
      }
    );

    if (leadsError) {
      toast.error(leadsError.message || "Erro ao solicitar leads");
      return null;
    }

    const leadsArray = leads as any[];
    if (!leadsArray || leadsArray.length === 0) {
      toast.error("Nenhum lead disponível com os filtros selecionados");
      return null;
    }

    // 2. Create job
    const { data: job, error: jobError } = await (supabase as any)
      .from("autolead_jobs")
      .insert({
        user_id: user.id,
        company_id: ucData?.company_id || null,
        total_leads: leadsArray.length,
        status: "running",
        message_template: wizardData.useDefaultMessage ? DEFAULT_MESSAGE : wizardData.messageTemplate,
        use_default_message: wizardData.useDefaultMessage,
        selected_ddds: wizardData.ddds,
        tipo_lead: wizardData.tipoLead,
        whatsapp_instance_ids: wizardData.whatsappInstanceIds,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (jobError || !job) {
      toast.error("Erro ao criar job");
      return null;
    }

    // 3. Generate scheduled messages with anti-ban logic
    const template = wizardData.useDefaultMessage ? DEFAULT_MESSAGE : wizardData.messageTemplate;
    const instances = wizardData.whatsappInstanceIds;
    const shuffledLeads = [...leadsArray].sort(() => Math.random() - 0.5);

    const now = new Date();
    let currentTime = new Date(now);
    
    // If outside send window, push to next day 08:30
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    if (hour < 8 || (hour === 8 && minute < 30)) {
      currentTime.setHours(8, 30, 0, 0);
    } else if (hour >= 18 || (hour === 18 && minute > 30)) {
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(8, 30, 0, 0);
    }

    const messagesToInsert = shuffledLeads.map((lead: any, index: number) => {
      // Random delay 2-7 min
      const delay = Math.floor(Math.random() * (7 - 2 + 1) + 2);
      currentTime = new Date(currentTime.getTime() + delay * 60000);

      // Pause every N messages
      if (index > 0 && index % 10 === 0) {
        currentTime = new Date(currentTime.getTime() + 10 * 60000);
      }

      // Check send window
      const h = currentTime.getHours();
      const m = currentTime.getMinutes();
      if (h >= 18 && m > 30) {
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(8, 30, 0, 0);
      }

      // Round-robin instance
      const instanceId = instances[index % instances.length];

      // Personalize message
      const personalizedMsg = template
        .replace(/\{\{nome\}\}/g, lead.name || "")
        .replace(/\{\{cidade\}\}/g, "")
        .replace(/\{\{beneficio\}\}/g, lead.convenio || lead.tipo_beneficio || "");

      return {
        job_id: job.id,
        lead_id: lead.id || lead.lead_id || null,
        lead_name: lead.name || null,
        phone: lead.phone,
        whatsapp_instance_id: instanceId,
        message: personalizedMsg,
        status: "scheduled",
        scheduled_at: currentTime.toISOString(),
      };
    });

    // Insert messages in batches
    const batchSize = 50;
    for (let i = 0; i < messagesToInsert.length; i += batchSize) {
      const batch = messagesToInsert.slice(i, i + batchSize);
      await (supabase as any).from("autolead_messages").insert(batch);
    }

    toast.success(`Prospecção iniciada com ${leadsArray.length} leads!`);
    await fetchJobs();
    await fetchCredits();
    return job.id;
  }, [user?.id, fetchJobs, fetchCredits]);

  const pauseJob = useCallback(async (jobId: string) => {
    await (supabase as any)
      .from("autolead_jobs")
      .update({ status: "paused", paused_at: new Date().toISOString() })
      .eq("id", jobId);
    toast.info("Prospecção pausada");
    fetchJobs();
  }, [fetchJobs]);

  const resumeJob = useCallback(async (jobId: string) => {
    await (supabase as any)
      .from("autolead_jobs")
      .update({ status: "running", paused_at: null })
      .eq("id", jobId);
    toast.success("Prospecção retomada");
    fetchJobs();
  }, [fetchJobs]);

  const cancelJob = useCallback(async (jobId: string) => {
    await (supabase as any)
      .from("autolead_messages")
      .update({ status: "cancelled" })
      .eq("job_id", jobId)
      .eq("status", "scheduled");
    await (supabase as any)
      .from("autolead_jobs")
      .update({ status: "cancelled", finished_at: new Date().toISOString() })
      .eq("id", jobId);
    toast.info("Prospecção cancelada");
    fetchJobs();
  }, [fetchJobs]);

  return {
    jobs,
    activeJob,
    messages,
    credits,
    loading,
    createJob,
    pauseJob,
    resumeJob,
    cancelJob,
    fetchMessages,
    refreshCredits: fetchCredits,
  };
}
