import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, QrCode } from "lucide-react";
import type { CreditPackage, ModuleRow } from "../hooks/useMarketplace";

interface Props {
  module: ModuleRow;
  packages: CreditPackage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fmt = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CreditPackagesDialog({ module, packages, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [customQty, setCustomQty] = useState("");

  const buy = async (body: any, method: 'stripe' | 'abacatepay') => {
    setLoading(method);
    try {
      const functionName = method === 'stripe' ? "create-checkout" : "abacatepay-create-checkout";
      const { data, error } = await supabase.functions.invoke(functionName, { body });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      toast.error(e.message || "Erro ao iniciar pagamento");
    } finally {
      setLoading(null);
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
        <div className="grid gap-4 sm:grid-cols-2">
          {packages.map((p) => (
            <Card key={p.id} className="p-4 flex flex-col gap-3">
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm text-muted-foreground">{p.credits.toLocaleString("pt-BR")} créditos</div>
              </div>
              <div className="text-2xl font-bold">{fmt(p.price_cents)}</div>
              <div className="flex flex-col gap-2 mt-auto">
                <Button 
                  onClick={() => buy({ module_slug: module.slug, package_id: p.id }, 'stripe')} 
                  disabled={loading !== null}
                  variant="outline"
                  className="w-full"
                >
                  {loading === 'stripe' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                  Cartão
                </Button>
                <Button 
                  onClick={() => buy({ module_slug: module.slug, package_id: p.id }, 'abacatepay')} 
                  disabled={loading !== null}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {loading === 'abacatepay' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <QrCode className="h-4 w-4 mr-2" />}
                  PIX
                </Button>
              </div>
            </Card>
          ))}
        </div>
        <Card className="p-4 mt-2">
          <Label>Pacote personalizado</Label>
          <div className="grid gap-3 mt-2">
            <div className="flex items-center gap-3">
              <Input
                type="number" min={1} placeholder="Quantidade"
                value={customQty} onChange={(e) => setCustomQty(e.target.value)}
                className="flex-1"
              />
              <div className="font-semibold whitespace-nowrap">{fmt(customCents)}</div>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant="outline"
                disabled={loading !== null || customCents < 50}
                onClick={() => buy({ module_slug: module.slug, custom_credits: parseInt(customQty, 10) }, 'stripe')}
              >
                {loading === 'stripe' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Cartão
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={loading !== null || customCents < 50}
                onClick={() => buy({ module_slug: module.slug, custom_credits: parseInt(customQty, 10) }, 'abacatepay')}
              >
                {loading === 'abacatepay' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <QrCode className="h-4 w-4 mr-2" />}
                PIX
              </Button>
            </div>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

