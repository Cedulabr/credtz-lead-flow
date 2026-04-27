import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ConsultaResponse, NormPhone } from "../types";
import type { Metodo } from "../utils/methodConfig";

interface RunArgs {
  cpf: string;
  metodo: Metodo;
  leadId?: string | null;
  forceRefresh?: boolean;
}

export function useTelefoniaQuery() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsultaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async ({ cpf, metodo, leadId, forceRefresh }: RunArgs) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("novavida-consulta", {
        body: {
          cpf,
          metodo,
          lead_id: leadId ?? null,
          force_refresh: !!forceRefresh,
        },
      });
      if (fnErr) {
        setError(fnErr.message || "request_failed");
        setResult(null);
        return;
      }
      const res = data as ConsultaResponse & { error?: string };
      setResult(res);
      if (res?.status && res.status !== "success" && res.status !== "not_found") {
        setError(res.status);
      } else if ((res as any)?.error && !res?.status) {
        setError((res as any).error);
      }
    } catch (e: any) {
      setError(e?.message || "request_failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { loading, result, error, run, reset, setResult };
}

export type { NormPhone };
