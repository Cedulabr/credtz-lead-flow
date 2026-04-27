import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ConsultaRow {
  id: string;
  company_id: string;
  lead_id: string | null;
  cpf: string;
  metodo: string;
  status: string;
  nome_retornado: string | null;
  total_telefones: number | null;
  from_cache: boolean | null;
  credits_used: number | null;
  resultado: any;
  queried_by: string | null;
  queried_at: string;
}

export interface HistoricoFilters {
  from?: string; // ISO date
  to?: string;
  metodo?: string;
  status?: string;
  cpf?: string;
}

export function useTelefoniaHistorico(filters: HistoricoFilters) {
  const [rows, setRows] = useState<ConsultaRow[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [leadsMap, setLeadsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("telefonia_consultas")
        .select("*")
        .order("queried_at", { ascending: false })
        .limit(200);
      if (filters.from) q = q.gte("queried_at", filters.from);
      if (filters.to) q = q.lte("queried_at", filters.to);
      if (filters.metodo) q = q.eq("metodo", filters.metodo);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.cpf) q = q.ilike("cpf", `%${filters.cpf.replace(/\D/g, "")}%`);

      const { data } = await q;
      const list = (data || []) as ConsultaRow[];
      setRows(list);

      // resolve user names
      const userIds = Array.from(new Set(list.map((r) => r.queried_by).filter(Boolean))) as string[];
      if (userIds.length) {
        const { data: profs } = await (supabase.rpc as any)("get_profiles_by_ids", {
          _user_ids: userIds,
        });
        const m: Record<string, string> = {};
        (profs || []).forEach((p: any) => {
          m[p.id || p.user_id] = p.name || p.full_name || p.email || "—";
        });
        setUsersMap(m);
      } else {
        setUsersMap({});
      }

      // resolve lead names
      const leadIds = Array.from(new Set(list.map((r) => r.lead_id).filter(Boolean))) as string[];
      if (leadIds.length) {
        const { data: leads } = await supabase.from("leads").select("id, name").in("id", leadIds);
        const m: Record<string, string> = {};
        (leads || []).forEach((l: any) => {
          m[l.id] = l.name;
        });
        setLeadsMap(m);
      } else {
        setLeadsMap({});
      }
    } finally {
      setLoading(false);
    }
  }, [filters.from, filters.to, filters.metodo, filters.status, filters.cpf]);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, usersMap, leadsMap, loading, reload: load };
}
