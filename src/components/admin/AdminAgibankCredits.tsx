import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Minus, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Row {
  id: string;
  name: string;
  email: string;
  balance: number;
}

export function AdminAgibankCredits() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<Row | null>(null);
  const [action, setAction] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;

      const { data: credits } = await supabase
        .from("agibank_credits")
        .select("user_id, balance");

      const map = new Map((credits || []).map((c: any) => [c.user_id, c.balance]));
      setRows((profiles || []).map((p: any) => ({
        id: p.id,
        name: p.name || p.email || "Sem nome",
        email: p.email || "",
        balance: map.get(p.id) || 0,
      })));
    } catch (e: any) {
      toast.error("Erro ao carregar", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = search.toLowerCase().trim();
    if (!t) return rows;
    return rows.filter(r => r.name.toLowerCase().includes(t) || r.email.toLowerCase().includes(t));
  }, [rows, search]);

  const submit = async () => {
    if (!target) return;
    const n = parseInt(amount, 10);
    if (!n || n <= 0) {
      toast.error("Informe uma quantidade válida");
      return;
    }
    setSubmitting(true);
    try {
      const delta = action === "add" ? n : -n;
      const { data, error } = await supabase.rpc("agibank_add_credits", {
        _user_id: target.id,
        _amount: delta,
      });
      if (error) throw error;
      const r = data as { success: boolean; balance?: number; error?: string };
      if (!r.success) throw new Error(r.error || "Erro");
      toast.success(`Saldo atualizado: ${r.balance} créditos`);
      setTarget(null);
      setAmount("");
      load();
    } catch (e: any) {
      toast.error("Erro", { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-emerald-600" />
            Créditos Leads Agibank
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}

          <div className="space-y-2">
            {filtered.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="gap-1">
                    <Coins className="h-3 w-3" /> {r.balance}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => { setTarget(r); setAction("add"); }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setTarget(r); setAction("remove"); }}>
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {!loading && filtered.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-6">Nenhum usuário encontrado</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!target} onOpenChange={(v) => !v && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "add" ? "Adicionar" : "Remover"} créditos — {target?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Saldo atual: {target?.balance} créditos</p>
            <div className="space-y-1">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={submitting}>Cancelar</Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Salvando..." : (action === "add" ? "Adicionar" : "Remover")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
