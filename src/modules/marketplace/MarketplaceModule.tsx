import { useState } from "react";
import { useMarketplace } from "./hooks/useMarketplace";
import { ModuleCard } from "./components/ModuleCard";
import { CreditPackagesDialog } from "./components/CreditPackagesDialog";
import { AbacatePayCheckoutDialog } from "./components/AbacatePayCheckoutDialog";
import { Loader2, Store } from "lucide-react";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import type { ModuleRow } from "./hooks/useMarketplace";

const CATEGORY_LABEL: Record<string, string> = {
  vendas: "Vendas",
  gestao: "Gestão",
  comunicacao: "Comunicação",
  geral: "Geral",
};

export function MarketplaceModule() {
  const { modules, companyModules, wallets, packages, loading, refresh } = useMarketplace();
  const [selected, setSelected] = useState<ModuleRow | null>(null);
  const [subscribing, setSubscribing] = useState<ModuleRow | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      toast.success("Pagamento concluído! Atualizando...");
      // Give Stripe webhook a moment, then refresh
      setTimeout(() => { refresh(); }, 1500);
      searchParams.delete("status");
      searchParams.delete("session_id");
      setSearchParams(searchParams, { replace: true });
    } else if (status === "canceled") {
      toast.info("Pagamento cancelado");
      searchParams.delete("status");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, refresh]);

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const grouped = modules.reduce<Record<string, ModuleRow[]>>((acc, m) => {
    (acc[m.category] ||= []).push(m);
    return acc;
  }, {});

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Store className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Marketplace Easyn</h1>
          <p className="text-sm text-muted-foreground">Contrate módulos, compre créditos e expanda seu CRM</p>
        </div>
      </div>

      {Object.entries(grouped).map(([cat, mods]) => (
        <section key={cat} className="space-y-3">
          <h2 className="text-lg font-semibold">{CATEGORY_LABEL[cat] ?? cat}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mods.map((m) => (
              <ModuleCard
                key={m.id}
                module={m}
                companyModule={companyModules.find((c) => c.module_slug === m.slug)}
                wallet={wallets.find((w) => w.module_slug === m.slug)}
                onBuyCredits={() => setSelected(m)}
                onSubscribe={() => setSubscribing(m)}
                onRefresh={refresh}
              />
            ))}
          </div>
        </section>
      ))}

      {selected && (
        <CreditPackagesDialog
          module={selected}
          packages={packages.filter((p) => p.module_slug === selected.slug)}
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
        />
      )}

      {subscribing && (
        <AbacatePayCheckoutDialog
          module={subscribing}
          open={!!subscribing}
          onOpenChange={(o) => !o && setSubscribing(null)}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

export default MarketplaceModule;
