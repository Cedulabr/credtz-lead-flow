import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useWhatsApp() {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchToken = useCallback(async () => {
    if (!user?.id) { setLoadingToken(false); return; }
    setLoadingToken(true);
    try {
      const { data, error } = await (supabase as any)
        .from("whatsapp_instances")
        .select("api_token")
        .eq("user_id", user.id)
        .not("api_token", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.api_token) {
        setToken(data.api_token);
      } else {
        // Try company-level token
        const { data: ucData } = await supabase
          .from("user_companies")
          .select("company_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (ucData?.company_id) {
          const { data: companyInstance } = await (supabase as any)
            .from("whatsapp_instances")
            .select("api_token")
            .eq("company_id", ucData.company_id)
            .not("api_token", "is", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (companyInstance?.api_token) {
            setToken(companyInstance.api_token);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching WhatsApp token:", e);
    } finally {
      setLoadingToken(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchToken(); }, [fetchToken]);

  const sendTextMessage = useCallback(async (number: string, body: string, clientName?: string) => {
    if (!token) {
      toast.error("Token WhatsApp não configurado. Acesse o módulo WhatsApp para configurar.");
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
  }, [token]);

  const sendMediaMessage = useCallback(async (number: string, mediaBase64: string, mediaName: string, message?: string, clientName?: string) => {
    if (!token) {
      toast.error("Token WhatsApp não configurado. Acesse o módulo WhatsApp para configurar.");
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
  }, [token]);

  return {
    token,
    hasToken: !!token,
    loadingToken,
    sending,
    sendTextMessage,
    sendMediaMessage,
    refreshToken: fetchToken,
  };
}
