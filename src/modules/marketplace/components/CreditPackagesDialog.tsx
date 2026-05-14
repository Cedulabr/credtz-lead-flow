import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { CreditPackage, ModuleRow } from "../hooks/useMarketplace";

interface Props {
  module: ModuleRow;
  packages: CreditPackage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fmt = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CreditPackagesDialog({ module, packages, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [customQty, setCustomQty] = useState("");

  const buy = async (body: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      toast.error(e.message || "Erro ao iniciar pagamento");
    } finally {
      setLoading(false);
    }
  };

  const customCents = (parseInt(customQty || "0", 10) || 0) * module.credit_price_cents;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Comprar créditos — {module.name}</DialogTitle>
          <DialogDescription>{fmt(module.credit_price_cents)} por crédito</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {packages.map((p) => (
            <Card key={p.id} className="p-4 flex flex-col gap-2">
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm text-muted-foreground">{p.credits.toLocaleString("pt-BR")} créditos</div>
              </div>
              <div className="text-2xl font-bold">{fmt(p.price_cents)}</div>
              <Button onClick={() => buy({ module_slug: module.slug, package_id: p.id })} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Comprar"}
              </Button>
            </Card>
          ))}
        </div>
        <Card className="p-4 mt-2">
          <Label>Pacote personalizado</Label>
          <div className="flex items-end gap-3 mt-2">
            <div className="flex-1">
              <Input
                type="number" min={1} placeholder="Quantidade"
                value={customQty} onChange={(e) => setCustomQty(e.target.value)}
              />
              <div className="text-sm text-muted-foreground mt-1">Total: {fmt(customCents)}</div>
            </div>
            <Button
              disabled={loading || customCents < 50}
              onClick={() => buy({ module_slug: module.slug, custom_credits: parseInt(customQty, 10) })}
            >
              Comprar
            </Button>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
