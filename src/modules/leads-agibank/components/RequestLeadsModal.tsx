import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  currentBalance: number;
}

const REGIONS = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
const INCOME_RANGES = ["Até R$ 2.000", "R$ 2.000 - R$ 5.000", "R$ 5.000 - R$ 10.000", "Acima de R$ 10.000"];

export function RequestLeadsModal({ open, onClose, currentBalance }: Props) {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState<number>(50);
  const [region, setRegion] = useState<string>("");
  const [income, setIncome] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!quantity || quantity <= 0) {
      toast.error("Informe uma quantidade válida");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("agibank_lead_requests" as any).insert({
      user_id: user.id,
      quantity,
      region: region || null,
      income_range: income || null,
      notes: notes || null,
    });
    setSending(false);
    if (error) {
      toast.error("Erro ao enviar solicitação", { description: error.message });
      return;
    }
    toast.success("Solicitação enviada ao administrador");
    setQuantity(50);
    setRegion("");
    setIncome("");
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Leads</DialogTitle>
          <DialogDescription>
            Envie uma solicitação ao administrador. Cada lead consome 1 crédito ao ser aberto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            Saldo atual: <span className="font-semibold text-primary">{currentBalance} créditos</span>
          </div>

          <div className="space-y-2">
            <Label>Quantidade desejada</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">Custo estimado: {quantity} créditos</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Região</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                <SelectContent>
                  {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Renda</Label>
              <Select value={income} onValueChange={setIncome}>
                <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                <SelectContent>
                  {INCOME_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Perfil desejado, urgência..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>Cancelar</Button>
          <Button onClick={submit} disabled={sending}>
            <Send className="h-4 w-4 mr-1" />
            {sending ? "Enviando..." : "Enviar solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
