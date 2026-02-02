import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClientSearchResult } from "../types";

export function useClientSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<ClientSearchResult | null>(null);

  const searchByCPF = useCallback(async (cpf: string): Promise<ClientSearchResult> => {
    const cleanCPF = cpf.replace(/\D/g, "");
    
    if (cleanCPF.length !== 11) {
      setResult(null);
      return { found: false };
    }

    setIsSearching(true);
    try {
      // Search for last operation with this CPF
      const { data, error } = await supabase
        .from('televendas')
        .select('nome, telefone, banco, tipo_operacao, data_venda')
        .eq('cpf', cleanCPF)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error searching client:', error);
        return { found: false };
      }

      if (data) {
        const searchResult: ClientSearchResult = {
          found: true,
          nome: data.nome,
          telefone: data.telefone,
          lastOperation: {
            banco: data.banco,
            tipo_operacao: data.tipo_operacao,
            data: data.data_venda
          }
        };
        setResult(searchResult);
        return searchResult;
      }

      setResult({ found: false });
      return { found: false };
    } catch (error) {
      console.error('Error in client search:', error);
      return { found: false };
    } finally {
      setIsSearching(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
  }, []);

  return {
    isSearching,
    result,
    searchByCPF,
    reset
  };
}
