import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, AlertCircle, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { SearchForm } from "./SearchForm";
import { ResultCard } from "./ResultCard";
import { useTelefoniaQuery } from "../hooks/useTelefoniaQuery";
import { useTelefoniaUsage } from "../hooks/useTelefoniaUsage";
import type { Metodo } from "../utils/methodConfig";
import { toast } from "sonner";

interface Props {
  leadContext?: { id: string; name: string } | null;
  onGoToConfig: () => void;
}

export function ConsultarTab({ leadContext, onGoToConfig }: Props) {
  const { loading, result, error, run } = useTelefoniaQuery();
  const { stats } = useTelefoniaUsage();
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
    <div className="max-w-[720px] mx-auto space-y-4">
      {/* Hero compact */}
      <Card className="p-4 sm:p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Phone className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-lg leading-tight">Consultar telefones por CPF</h2>
              <Badge variant="outline" className="text-[10px] gap-1">
                <Sparkles className="h-3 w-3" /> Nova Vida TI
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Localize números, WhatsApp e perfil completo. Cache de 7 dias para o mesmo CPF.
            </p>
          </div>
          <div className="flex gap-2 ml-auto text-center">
            <div className="px-3 py-1.5 rounded-md bg-background/60">
              <div className="text-lg font-bold leading-none">{stats.total}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Mês</div>
            </div>
            <div className="px-3 py-1.5 rounded-md bg-background/60">
              <div className="text-lg font-bold leading-none text-green-600">{stats.cache}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Cache</div>
            </div>
            <div className="px-3 py-1.5 rounded-md bg-background/60">
              <div className="text-lg font-bold leading-none">{stats.credits}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Créditos</div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <SearchForm loading={loading} onSubmit={handleSubmit} />
      </Card>

      {errInfo && (
        <Alert variant={errInfo.variant}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
            <span>{errInfo.msg}</span>
            {(error === "credentials_not_configured" || error === "auth_error") && (
              <Button size="sm" variant="outline" onClick={onGoToConfig}>
                Ir para Configurações →
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {loading && (
        <Card className="p-4 space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </Card>
      )}

      {!loading && isNotFound && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>Nenhum número encontrado para este CPF.</AlertDescription>
        </Alert>
      )}

      {!loading && isSuccess && result?.from_cache && (
        <Alert className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
            <span>
              Resultado em <b>cache</b>
              {cachedAt && ` — consultado em ${cachedAt.toLocaleString("pt-BR")}`}. Nenhum
              crédito consumido.
            </span>
            <Button size="sm" variant="outline" onClick={handleForce}>
              Forçar nova consulta
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!loading && isSuccess && result && (
        <ResultCard
          metodo={lastArgs?.metodo || "NVBOOK_CEL_OBG_WHATS"}
          resultado={result.resultado}
          telefones={result.telefones || []}
          leadContext={leadContext}
          onLeadUpdated={() => toast.success("Lead atualizado")}
        />
      )}
    </div>
  );
}
