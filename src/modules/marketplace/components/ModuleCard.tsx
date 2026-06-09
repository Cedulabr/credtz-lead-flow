import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Clock, Users, FileText, StickyNote, MessageSquare, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import type { ModuleRow, CompanyModule, WalletRow } from "../hooks/useMarketplace";

const ICONS: Record<string, any> = {
  Sparkles, Zap, Clock, Users, FileText, StickyNote, MessageSquare,
};
const fmt = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  module: ModuleRow;
  companyModule?: CompanyModule;
  wallet?: WalletRow;
  onBuyCredits: () => void;
  onSubscribe: () => void;
  onRefresh: () => void;
}

export function ModuleCard({ module, companyModule, wallet, onBuyCredits, onSubscribe, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const Icon = (module.icon && ICONS[module.icon]) || Sparkles;
  const status = companyModule?.status ?? "inactive";

  const subscribe = async () => {
    // If it's the specific product mentioned or if we want to use AbacatePay for PIX
    // prod_Y0mn4nhzgjzAwuyHjPEMkD3W is likely the stripe product ID or a reference.
    // If the user wants PIX (AbacatePay), we use the new dialog.
    onSubscribe();
  };

  const portal = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Erro ao abrir portal");
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = () => {
    if (status === "active") return <Badge className="bg-emerald-600">Ativo</Badge>;
    if (status === "trialing") return <Badge className="bg-blue-600">Trial</Badge>;
    if (status === "past_due") return <Badge variant="destructive">Inadimplente</Badge>;
    if (status === "canceled") return <Badge variant="outline">Cancelado</Badge>;
    return null;
  };

  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold">{module.name}</div>
            <div className="text-xs text-muted-foreground capitalize">{module.category}</div>
          </div>
        </div>
        {statusBadge()}
      </div>

      {module.description && (
        <p className="text-sm text-muted-foreground">{module.description}</p>
      )}

      <div className="mt-1">
        {module.billing_type === "subscription" && (
          <div className="text-2xl font-bold">{fmt(module.monthly_price_cents)}<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
        )}
        {module.billing_type === "credits" && (
          <div className="text-2xl font-bold">{fmt(module.credit_price_cents)}<span className="text-sm font-normal text-muted-foreground">/crédito</span></div>
        )}
      </div>

      {wallet && (
        <div className="text-sm bg-muted rounded p-2">
          Saldo: <strong>{wallet.balance.toLocaleString("pt-BR")}</strong> créditos
        </div>
      )}

      <div className="flex gap-2 mt-auto pt-2">
        {module.billing_type === "credits" ? (
          <Button onClick={onBuyCredits} className="flex-1" disabled={loading}>
            Comprar créditos
          </Button>
        ) : status === "active" || status === "trialing" || status === "past_due" ? (
          <Button onClick={portal} variant="outline" className="flex-1" disabled={loading}>
            <ExternalLink className="h-4 w-4 mr-2" />Gerenciar
          </Button>
        ) : (
          <Button onClick={subscribe} className="flex-1" disabled={loading}>
            Assinar
          </Button>
        )}
      </div>
    </Card>
  );
}
