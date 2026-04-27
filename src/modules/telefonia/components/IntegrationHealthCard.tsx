import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Activity, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  companyId: string | null;
  hasCredentials: boolean;
  tokenExpiresAt: string | null;
}

export function IntegrationHealthCard({ companyId, hasCredentials, tokenExpiresAt }: Props) {
  const [stats, setStats] = useState({ total: 0, success: 0 });

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("telefonia_consultas")
        .select("status")
        .eq("company_id", companyId)
        .gte("queried_at", since);
      const list = data || [];
      const success = list.filter(
        (r: any) => r.status === "success" || r.status === "not_found",
      ).length;
      setStats({ total: list.length, success });
    })();
  }, [companyId]);

  const tokenValid = tokenExpiresAt && new Date(tokenExpiresAt) > new Date();
  const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : null;

  // próxima execução: 03:00 BRT do próximo dia (ou hoje se ainda não passou)
  const next = (() => {
    const now = new Date();
    const target = new Date();
    // 03:00 BRT = 06:00 UTC; usar getUTCHours para precisão
    target.setUTCHours(6, 0, 0, 0);
    if (target.getTime() <= now.getTime()) target.setUTCDate(target.getUTCDate() + 1);
    return target;
  })();

  return (
    <Card className="p-4 sm:p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Saúde da integração</h3>
      </div>
      <div className="space-y-2 text-sm">
        <Row ok={hasCredentials} label="Credenciais configuradas" />
        <Row ok={!!tokenValid} label={tokenValid ? "Token válido" : "Token expirado/ausente"} />
        <Row
          ok={successRate === null || successRate >= 80}
          label={
            successRate === null
              ? "Sem consultas nos últimos 30 dias"
              : `Taxa de sucesso (30d): ${successRate}% — ${stats.total} consulta(s)`
          }
        />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            Próxima renovação automática:{" "}
            <b className="text-foreground">{next.toLocaleString("pt-BR")}</b>
          </span>
        </div>
      </div>
    </Card>
  );
}

function Row({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <XCircle className="h-4 w-4 text-destructive" />
      )}
      <span className={ok ? "" : "text-destructive"}>{label}</span>
    </div>
  );
}
