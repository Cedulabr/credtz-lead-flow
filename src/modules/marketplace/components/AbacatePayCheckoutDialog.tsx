import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, QrCode } from "lucide-react";
import type { ModuleRow } from "../hooks/useMarketplace";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  module: ModuleRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AbacatePayCheckoutDialog({ module, open, onOpenChange, onSuccess }: Props) {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || "",
    email: user?.email || "",
    cpf: profile?.cpf || "",
    phone: profile?.phone || "",
    // Address fields could be added if mandatory by AbacatePay for transparent checkout,
    // but usually Name, Email and CPF are enough for PIX.
  });

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cpf || formData.cpf.length < 11) {
      toast.error("CPF inválido");
      return;
    }

    setLoading(true);
    try {
      // We invoke a new or updated function that handles the checkout with full customer data
      const { data, error } = await supabase.functions.invoke("abacatepay-create-checkout", {
        body: {
          module_slug: module.slug,
          customer: {
            name: formData.name,
            email: formData.email,
            taxId: formData.cpf.replace(/\D/g, ""),
            phone: formData.phone.replace(/\D/g, ""),
          }
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao iniciar pagamento");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assinar {module.name}</DialogTitle>
          <DialogDescription>
            Confirme seus dados para gerar o PIX de {fmt(module.monthly_price_cents)}/mês.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCheckout} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: João Silva"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="joao@exemplo.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                required
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <QrCode className="h-4 w-4 mr-2" />
            )}
            Gerar PIX
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
