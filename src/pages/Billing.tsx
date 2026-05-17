import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Receipt } from "lucide-react";
import { toast } from "sonner";
import { InvoicesTable } from "@/components/billing/InvoicesTable";

type CompanyModule = {
  id: string;
  module_slug: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  modules?: { name: string; monthly_price_cents: number };
};

const fmt = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

export default function Billing() {
  const [subs, setSubs] = useState<CompanyModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("company_modules")
        .select("id, module_slug, status, current_period_end, cancel_at_period_end, modules(name, monthly_price_cents)")
        .order("status");
      setSubs((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Erro ao abrir portal");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Receipt className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Faturamento</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas assinaturas e veja seu histórico de faturas</p>
        </div>
      </div>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Assinaturas ativas</h2>
          <Button onClick={openPortal} disabled={portalLoading} variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Gerenciar pagamento
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : subs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma assinatura ativa.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {subs.map((s) => (
              <div key={s.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{s.modules?.name ?? s.module_slug}</div>
                  {s.status === "active" && <Badge className="bg-emerald-600">Ativo</Badge>}
                  {s.status === "trialing" && <Badge className="bg-blue-600">Trial</Badge>}
                  {s.status === "past_due" && <Badge variant="destructive">Inadimplente</Badge>}
                  {s.status === "canceled" && <Badge variant="outline">Cancelado</Badge>}
                  {s.status === "inactive" && <Badge variant="secondary">Inativo</Badge>}
                </div>
                {s.modules?.monthly_price_cents ? (
                  <div className="text-sm text-muted-foreground">{fmt(s.modules.monthly_price_cents)}/mês</div>
                ) : null}
                {s.current_period_end && (
                  <div className="text-xs text-muted-foreground">
                    Próx. cobrança: {fmtDate(s.current_period_end)}
                  </div>
                )}
                {s.cancel_at_period_end && (
                  <div className="text-xs text-amber-600">
                    ⚠ Será cancelado em {fmtDate(s.current_period_end)}. Clique em "Gerenciar pagamento" para reativar.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Histórico de faturas</h2>
        <InvoicesTable />
      </Card>
    </div>
  );
}
