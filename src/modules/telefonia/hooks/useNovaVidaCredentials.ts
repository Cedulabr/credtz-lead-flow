import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface NovaVidaCredentials {
  id?: string;
  company_id?: string;
  usuario: string;
  senha: string;
  cliente: string;
  active?: boolean;
}

export function useNovaVidaCredentials() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [creds, setCreds] = useState<NovaVidaCredentials | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: uc } = await supabase
        .from("user_companies")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      const cid = (uc?.company_id as string) || null;
      setCompanyId(cid);
      if (!cid) {
        setCreds(null);
        setTokenExpiresAt(null);
        return;
      }
      const { data: c } = await supabase
        .from("novavida_credentials")
        .select("*")
        .eq("company_id", cid)
        .maybeSingle();
      setCreds(c as any);

      const { data: tk } = await supabase
        .from("novavida_token_cache")
        .select("expires_at")
        .eq("company_id", cid)
        .maybeSingle();
      setTokenExpiresAt((tk?.expires_at as string) || null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (input: { usuario: string; senha: string; cliente: string }) => {
    if (!companyId) throw new Error("Sem empresa associada");
    setSaving(true);
    try {
      const { error } = await supabase
        .from("novavida_credentials")
        .upsert(
          {
            company_id: companyId,
            usuario: input.usuario,
            senha: input.senha,
            cliente: input.cliente,
            active: true,
          },
          { onConflict: "company_id" },
        );
      if (error) throw error;
      await load();
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    const { data, error } = await supabase.functions.invoke("novavida-get-token", {
      body: {},
    });
    if (error) return { ok: false, message: error.message };
    if ((data as any)?.error) return { ok: false, message: (data as any).error };
    if ((data as any)?.token) {
      await load();
      return { ok: true, message: "Conexão estabelecida com sucesso. Token gerado." };
    }
    return { ok: false, message: "Resposta inesperada" };
  };

  const refreshTokenNow = async () => {
    const { data, error } = await supabase.functions.invoke("novavida-get-token", {
      body: { force_refresh: true },
    });
    if (error) return { ok: false, message: error.message };
    if ((data as any)?.error) return { ok: false, message: (data as any).error };
    await load();
    return { ok: true, message: "Token renovado com sucesso." };
  };

  const setManualToken = async (token: string) => {
    const { data, error } = await supabase.functions.invoke("novavida-get-token", {
      body: { manual_token: token },
    });
    if (error) return { ok: false, message: error.message };
    if ((data as any)?.error) return { ok: false, message: (data as any).error };
    await load();
    return { ok: true, message: "Token manual salvo. Válido por 24h." };
  };

  return {
    companyId,
    creds,
    tokenExpiresAt,
    loading,
    saving,
    save,
    testConnection,
    refreshTokenNow,
    setManualToken,
    reload: load,
  };
}
