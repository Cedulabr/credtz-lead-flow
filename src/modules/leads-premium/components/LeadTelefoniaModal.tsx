import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertCircle, Phone } from "lucide-react";
import { SearchForm } from "@/modules/telefonia/components/SearchForm";
import { ResultCard } from "@/modules/telefonia/components/ResultCard";
import { useTelefoniaQuery } from "@/modules/telefonia/hooks/useTelefoniaQuery";
import type { Metodo } from "@/modules/telefonia/utils/methodConfig";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: { id: string; name: string; cpf?: string | null } | null;
  onConsultaComplete?: () => void;
  onLeadUpdated?: () => void;
}

export function LeadTelefoniaModal({ open, onOpenChange, lead, onConsultaComplete, onLeadUpdated }: Props) {
  const { loading, result, error, run, reset } = useTelefoniaQuery();
  const [lastMetodo, setLastMetodo] = useState<Metodo>("NVBOOK_CEL_OBG_WHATS");

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  if (!lead) return null;

  const cpfDigits = (lead.cpf || "").replace(/\D/g, "");

  const handleSubmit = (cpf: string, metodo: Metodo) => {
    setLastMetodo(metodo);
    run({ cpf, metodo, leadId: lead.id });
  };

  const handleForce = () => {
    if (!cpfDigits) return;
    run({ cpf: cpfDigits, metodo: lastMetodo, leadId: lead.id, forceRefresh: true });
  };

  // notify parent when consulta succeeds
  useEffect(() => {
    if (result?.status === "success") {
      onConsultaComplete?.();
    }
  }, [result?.status]);

  const errorMap: Record<string, { msg: string; variant: "default" | "destructive" }> = {
    quota_exceeded: { msg: "⚠️ Limite de consultas atingido para este mês.", variant: "destructive" },
    auth_error: { msg: "❌ Credenciais Nova Vida TI inválidas. Configure em Telefonia → Configurações.", variant: "destructive" },
    no_access: { msg: "❌ Sem acesso ao sistema Nova Vida TI.", variant: "destructive" },
    credentials_not_configured: { msg: "Configure suas credenciais em Telefonia → Configurações.", variant: "default" },
  };
  const errInfo = error ? errorMap[error] : null;
  const isSuccess = result?.status === "success";
  const isNotFound = result?.status === "not_found";
  const cachedAt = result?.cached_at ? new Date(result.cached_at) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Consultar telefones do lead
          </DialogTitle>
          <DialogDescription>
            Lead: <b>{lead.name}</b> · CPF: <span className="font-mono">{lead.cpf || "—"}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <SearchForm loading={loading} onSubmit={handleSubmit} initialCpf={cpfDigits} lockCpf />

          {errInfo && (
            <Alert variant={errInfo.variant}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errInfo.msg}</AlertDescription>
            </Alert>
          )}

          {isNotFound && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>Nenhum número encontrado para este CPF.</AlertDescription>
            </Alert>
          )}

          {isSuccess && result?.from_cache && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
                <span>
                  Resultado em cache
                  {cachedAt && ` — consultado em ${cachedAt.toLocaleString("pt-BR")}`}. Nenhum crédito consumido.
                </span>
                <Button size="sm" variant="link" onClick={handleForce} className="h-auto p-0">
                  Forçar nova consulta
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isSuccess && result && (
            <ResultCard
              metodo={lastMetodo}
              resultado={result.resultado}
              telefones={result.telefones || []}
              leadContext={{ id: lead.id, name: lead.name }}
              onLeadUpdated={() => {
                onLeadUpdated?.();
                onConsultaComplete?.();
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
