import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, AlertCircle, Phone, Link as LinkIcon } from "lucide-react";
import { SearchForm } from "./SearchForm";
import { ResultCard } from "./ResultCard";
import { useTelefoniaQuery } from "../hooks/useTelefoniaQuery";
import type { Metodo } from "../utils/methodConfig";
import { toast } from "sonner";

interface Props {
  leadContext?: { id: string; name: string } | null;
  onGoToConfig: () => void;
}

export function ConsultarTab({ leadContext, onGoToConfig }: Props) {
  const { loading, result, error, run, reset } = useTelefoniaQuery();
  const [lastArgs, setLastArgs] = useState<{ cpf: string; metodo: Metodo } | null>(null);

  const handleSubmit = (cpf: string, metodo: Metodo) => {
    setLastArgs({ cpf, metodo });
    run({ cpf, metodo, leadId: leadContext?.id });
  };

  const handleForce = () => {
    if (!lastArgs) return;
    run({ cpf: lastArgs.cpf, metodo: lastArgs.metodo, leadId: leadContext?.id, forceRefresh: true });
  };

  const cachedAt = result?.cached_at ? new Date(result.cached_at) : null;
  const isSuccess = result?.status === "success";
  const isNotFound = result?.status === "not_found";

  const errorMap: Record<string, { msg: string; variant: "default" | "destructive" }> = {
    quota_exceeded: {
      msg: "⚠️ Limite de consultas atingido para este mês. Entre em contato com o suporte.",
      variant: "destructive",
    },
    auth_error: {
      msg: "❌ Credenciais da Nova Vida TI inválidas. Configure em Telefonia → Configurações.",
      variant: "destructive",
    },
    no_access: {
      msg: "❌ Sem acesso ao sistema Nova Vida TI. Verifique a configuração.",
      variant: "destructive",
    },
    credentials_not_configured: {
      msg: "Configure suas credenciais da Nova Vida TI para começar a consultar.",
      variant: "default",
    },
  };
  const errInfo = error ? errorMap[error] : null;

  return (
    <div className="max-w-[680px] mx-auto space-y-4">
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Consultar telefones por CPF</h2>
        </div>
        <SearchForm loading={loading} onSubmit={handleSubmit} />
      </Card>

      {errInfo && (
        <Alert variant={errInfo.variant}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>{errInfo.msg}</span>
            {error === "credentials_not_configured" && (
              <Button size="sm" variant="outline" onClick={onGoToConfig}>
                Ir para Configurações →
              </Button>
            )}
            {error === "auth_error" && (
              <Button size="sm" variant="outline" onClick={onGoToConfig}>
                Configurações
              </Button>
            )}
          </AlertDescription>
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
              {cachedAt && ` — consultado em ${cachedAt.toLocaleString("pt-BR")}`}. Nenhum
              crédito consumido.
            </span>
            <Button size="sm" variant="link" onClick={handleForce} className="h-auto p-0">
              Forçar nova consulta
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isSuccess && result && (
        <>
          <ResultCard
            metodo={lastArgs?.metodo || "NVBOOK_CEL_OBG_WHATS"}
            resultado={result.resultado}
            telefones={result.telefones || []}
            leadContext={leadContext}
            onLeadUpdated={() => toast.success("Lead atualizado")}
          />
          {leadContext && (result.telefones?.length || 0) > 0 && (
            <div className="sticky bottom-4 flex justify-center">
              <Button
                onClick={async () => {
                  // already linked via lead_id when called; show confirmation
                  toast.success(`Resultado vinculado ao lead ${leadContext.name}`);
                }}
                className="shadow-lg"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Vinculado ao lead {leadContext.name}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
