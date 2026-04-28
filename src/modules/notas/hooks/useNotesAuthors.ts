import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AuthorInfo {
  id: string;
  name: string | null;
  email: string | null;
}

/**
 * Busca os nomes dos criadores das notas para exibição.
 * Apenas relevante para gestores e admins (que veem notas de outros usuários).
 * Usa RPC get_profiles_by_ids que faz bypass seguro de RLS.
 */
export function useNotesAuthors(userIds: (string | null | undefined)[]) {
  const { profile, isAdmin } = useAuth();
  const [authors, setAuthors] = useState<Record<string, AuthorInfo>>({});

  const role = (profile as any)?.role as string | undefined;
  const isGestorOrAdmin = isAdmin || role === "gestor" || role === "admin";

  // build a stable key based on unique IDs
  const uniqueIds = Array.from(
    new Set(userIds.filter((id): id is string => !!id))
  ).sort();
  const key = uniqueIds.join(",");

  useEffect(() => {
    if (!isGestorOrAdmin || uniqueIds.length === 0) return;
    let cancelled = false;

    (async () => {
      // missing only
      const missing = uniqueIds.filter((id) => !authors[id]);
      if (missing.length === 0) return;

      try {
        const { data, error } = await supabase.rpc("get_profiles_by_ids", {
          user_ids: missing,
        });
        if (error || !data || cancelled) return;
        const map: Record<string, AuthorInfo> = { ...authors };
        (data as any[]).forEach((p) => {
          map[p.id] = { id: p.id, name: p.name, email: p.email };
        });
        setAuthors(map);
      } catch (e) {
        console.warn("Erro ao buscar autores das notas", e);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isGestorOrAdmin]);

  const getAuthorLabel = (userId: string | null | undefined): string | null => {
    if (!isGestorOrAdmin || !userId) return null;
    const a = authors[userId];
    if (!a) return null;
    return a.name || a.email || "Usuário";
  };

  return { authors, getAuthorLabel, isGestorOrAdmin };
}
