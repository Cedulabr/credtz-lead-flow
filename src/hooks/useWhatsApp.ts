import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WhatsAppInstance {
  id: string;
  instance_name: string;
  phone_number: string | null;
  hasToken: boolean;
}

export function useWhatsApp() {
  const { user } = useAuth();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchInstances = useCallback(async () => {
    if (!user?.id) { setLoadingInstances(false); return; }
    setLoadingInstances(true);
    try {
      // Fetch user's own instances
      const { data: userInstances } = await (supabase as any)
        .from("whatsapp_instances")
        .select("id, instance_name, phone_number, api_token")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch company-level instances
      const { data: ucData } = await supabase
        .from("user_companies")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      let companyInstances: any[] = [];
      if (ucData?.company_id) {
        const { data } = await (supabase as any)
          .from("whatsapp_instances")
          .select("id, instance_name, phone_number, api_token")
          .eq("company_id", ucData.company_id)
          .not("api_token", "is", null)
          .order("created_at", { ascending: false });
        companyInstances = data || [];
      }

      // Merge, dedup by id
      const allRaw = [...(userInstances || []), ...companyInstances];
      const seen = new Set<string>();
      const merged: WhatsAppInstance[] = [];
      for (const inst of allRaw) {
        if (!seen.has(inst.id)) {
          seen.add(inst.id);
          merged.push({
            id: inst.id,
            instance_name: inst.instance_name || "Instância",
            phone_number: inst.phone_number || null,
            hasToken: !!inst.api_token,
          });
        }
      }
      setInstances(merged);
    } catch (e) {
      console.error("Error fetching WhatsApp instances:", e);
    } finally {
      setLoadingInstances(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchInstances(); }, [fetchInstances]);

  const getTokenForInstance = useCallback(async (instanceId: string): Promise<string | null> => {
    const { data } = await (supabase as any)
      .from("whatsapp_instances")
      .select("api_token")
      .eq("id", instanceId)
      .maybeSingle();
    return data?.api_token || null;
  }, []);

  const sendTextMessage = useCallback(async (number: string, body: string, clientName?: string, instanceId?: string) => {
    const targetId = instanceId || instances.find(i => i.hasToken)?.id;
    if (!targetId) {
      toast.error("Nenhuma instância WhatsApp configurada.");
      return false;
    }
    const token = await getTokenForInstance(targetId);
    if (!token) {
      toast.error("Token não encontrado para esta instância.");
      return false;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { apiToken: token, number, message: body, clientName },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("Mensagem enviada via WhatsApp!");
        return true;
      } else {
        throw new Error(data?.error || "Falha ao enviar");
      }
    } catch (e: any) {
      console.error("WhatsApp send error:", e);
      toast.error(e.message || "Erro ao enviar mensagem WhatsApp");
      return false;
    } finally {
      setSending(false);
    }
  }, [instances, getTokenForInstance]);

  const sendMediaMessage = useCallback(async (number: string, mediaBase64: string, mediaName: string, message?: string, clientName?: string, instanceId?: string) => {
    const targetId = instanceId || instances.find(i => i.hasToken)?.id;
    if (!targetId) {
      toast.error("Nenhuma instância WhatsApp configurada.");
      return false;
    }
    const token = await getTokenForInstance(targetId);
    if (!token) {
      toast.error("Token não encontrado para esta instância.");
      return false;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { apiToken: token, number, message, mediaBase64, mediaName, clientName },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("Mensagem com mídia enviada via WhatsApp!");
        return true;
      } else {
        throw new Error(data?.error || "Falha ao enviar");
      }
    } catch (e: any) {
      console.error("WhatsApp media send error:", e);
      toast.error(e.message || "Erro ao enviar mídia via WhatsApp");
      return false;
    } finally {
      setSending(false);
    }
  }, [instances, getTokenForInstance]);

  const scheduleMessage = useCallback(async (
    instanceId: string,
    phone: string,
    message: string,
    scheduledAt: Date,
    clientName?: string,
    sourceModule?: string,
    sourceRecordId?: string,
  ) => {
    if (!user?.id) return false;
    try {
      const { error } = await (supabase as any)
        .from("whatsapp_scheduled_messages")
        .insert({
          user_id: user.id,
          instance_id: instanceId,
          phone,
          message,
          client_name: clientName || null,
          scheduled_at: scheduledAt.toISOString(),
          source_module: sourceModule || null,
          source_record_id: sourceRecordId || null,
        });
      if (error) throw error;
      toast.success("Mensagem agendada com sucesso!");
      return true;
    } catch (e: any) {
      console.error("Schedule error:", e);
      toast.error("Erro ao agendar mensagem");
      return false;
    }
  }, [user?.id]);

  return {
    instances,
    hasInstances: instances.some(i => i.hasToken),
    loadingInstances,
    sending,
    sendTextMessage,
    sendMediaMessage,
    scheduleMessage,
    refreshInstances: fetchInstances,
  };
}
