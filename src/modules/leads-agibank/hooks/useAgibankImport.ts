import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export interface ParsedRow { name: string; phone: string; document?: string | null; }

export interface ImportSummary {
  total: number;
  imported: number;
  skipped_duplicates: number;
  skipped_blacklist: number;
  skipped_invalid: number;
}

function pick(row: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

export function parseFile(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
        const parsed: ParsedRow[] = rows.map(r => ({
          name: pick(r, "name", "nome", "Nome", "NOME"),
          phone: pick(r, "phone", "telefone", "Telefone", "TELEFONE", "celular"),
          document: pick(r, "document", "cpf", "CPF", "documento") || null,
        })).filter(r => r.name && r.phone);
        resolve(parsed);
      } catch (e) { reject(e); }
    };
    reader.readAsArrayBuffer(file);
  });
}

export function useAgibankImport() {
  const [isImporting, setIsImporting] = useState(false);

  const importLeads = useCallback(
    async (payload: {
      rows: ParsedRow[];
      file_name: string;
      agent_ids: string[];
      assignment_mode: "round_robin" | "manual";
      manual_assignments?: Array<{ index: number; agent_id: string }>;
    }): Promise<ImportSummary | null> => {
      setIsImporting(true);
      try {
        const { data, error } = await supabase.functions.invoke("agibank-import-leads", { body: payload });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Falha na importação");
        toast.success(
          `Importação concluída: ${data.imported} importados, ${data.skipped_duplicates} duplicados, ${data.skipped_blacklist} blacklist`
        );
        return data as ImportSummary;
      } catch (e: any) {
        toast.error("Erro na importação", { description: e.message });
        return null;
      } finally {
        setIsImporting(false);
      }
    },
    []
  );

  return { isImporting, importLeads };
}
