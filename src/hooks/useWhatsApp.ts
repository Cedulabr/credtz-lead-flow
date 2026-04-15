import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WhatsAppInstance {
  id: string;
  instance_name: string;
  phone_number: string | null;
  isValid: boolean;
}

export function useWhatsApp() {
  const { user, profile } = useAuth();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchInstances = useCallback(async () => {
    if (!user?.id) { setLoadingInstances(false); return; }
    setLoadingInstances(true);
    try {
      const isAdmin = profile?.role === 'admin';
      let isGestor = false;
      let myCompanyId: string | null = null;

      if (!isAdmin) {
        const { data: ucData } = await supabase
          .from("user_companies")
          .select("company_id, company_role")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (ucData) {
          myCompanyId = ucData.company_id;
          isGestor = ucData.company_role === 'gestor';
        }
      }

      const { data: userInstances } = await (supabase as any)
        .from("whatsapp_instances")
        .select("id, instance_name, phone_number")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      let companyInstances: any[] = [];
      if ((isAdmin || isGestor) && myCompanyId) {
        const { data } = await (supabase as any)
          .from("whatsapp_instances")
          .select("id, instance_name, phone_number")
          .eq("company_id", myCompanyId)
          .not("instance_name", "is", null)
          .order("created_at", { ascending: false });
        companyInstances = data || [];
      }

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
            isValid: !!inst.instance_name,
          });
        }
      }
      setInstances(merged);
    } catch (e) {
      console.error("Error fetching WhatsApp instances:", e);
    } finally {
      setLoadingInstances(false);
    }
  }, [user?.id, profile?.role]);

  useEffect(() => { fetchInstances(); }, [fetchInstances]);

  const sendTextMessage = useCallback(async (number: string, body: string, clientName?: string, instanceId?: string, sourceModule?: string) => {
    const targetInst = instanceId
      ? instances.find(i => i.id === instanceId && i.isValid)
      : instances.find(i => i.isValid);

    if (!targetInst) {
      toast.error("Nenhuma instância WhatsApp configurada.");
      return false;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { instanceName: targetInst.instance_name, number, message: body, clientName, instanceId: targetInst.id, sourceModule },
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
  }, [instances]);

  const sendMediaMessage = useCallback(async (number: string, mediaBase64: string, mediaName: string, message?: string, clientName?: string, instanceId?: string, sourceModule?: string) => {
    const targetInst = instanceId
      ? instances.find(i => i.id === instanceId && i.isValid)
      : instances.find(i => i.isValid);

    if (!targetInst) {
      toast.error("Nenhuma instância WhatsApp configurada.");
      return false;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { instanceName: targetInst.instance_name, number, message, mediaBase64, mediaName, clientName, instanceId: targetInst.id, sourceModule },
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
  }, [instances]);

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
    hasInstances: instances.some(i => i.isValid),
    loadingInstances,
    sending,
    sendTextMessage,
    sendMediaMessage,
    scheduleMessage,
    refreshInstances: fetchInstances,
  };
}
