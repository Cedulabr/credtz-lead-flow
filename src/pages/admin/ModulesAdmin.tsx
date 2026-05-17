import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

type ModuleRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  billing_type: string;
  monthly_price_cents: number;
  credit_price_cents: number;
  stripe_price_id: string | null;
  trial_days: number | null;
  category: string;
  icon: string | null;
  active: boolean;
  features: any;
};

const empty: Partial<ModuleRow> = {
  slug: "", name: "", description: "", billing_type: "subscription",
  monthly_price_cents: 0, credit_price_cents: 0, stripe_price_id: "",
  trial_days: 0, category: "geral", icon: "Sparkles", active: true, features: [],
};

export default function ModulesAdmin() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<ModuleRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<ModuleRow>>(empty);
  const [featuresText, setFeaturesText] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: mods } = await supabase.from("modules").select("*").order("category").order("name");
    const { data: cm } = await supabase.from("company_modules").select("module_slug, status").eq("status", "active");
    const c: Record<string, number> = {};
    (cm || []).forEach((r: any) => { c[r.module_slug] = (c[r.module_slug] || 0) + 1; });
    setCounts(c);
    setRows((mods as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setFeaturesText(""); setOpen(true); };
  const openEdit = (r: ModuleRow) => {
    setForm(r);
    setFeaturesText(Array.isArray(r.features) ? r.features.join("\n") : "");
    setOpen(true);
  };

  const save = async () => {
    const features = featuresText.split("\n").map((s) => s.trim()).filter(Boolean);
    const payload: any = { ...form, features };
    if (form.id) {
      const { error } = await supabase.from("modules").update(payload).eq("id", form.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("modules").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Módulo salvo");
    setOpen(false);
    load();
  };

  const toggleActive = async (r: ModuleRow) => {
    await supabase.from("modules").update({ active: !r.active }).eq("id", r.id);
    load();
  };

  if (authLoading) return null;
  if (!isAdmin) return <div className="p-6">Acesso restrito ao administrador.</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Módulos</h1>
          <p className="text-sm text-muted-foreground">Configure produtos, preços e Stripe price IDs</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo módulo</Button>
      </div>

      <Card className="overflow-x-auto">
        {loading ? (
          <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Stripe Price ID</TableHead>
                <TableHead>Assinantes</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.slug}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.billing_type}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.billing_type === "subscription"
                      ? `R$ ${(r.monthly_price_cents / 100).toFixed(2)}/mês`
                      : `R$ ${(r.credit_price_cents / 100).toFixed(2)}/cr`}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.stripe_price_id || "—"}</TableCell>
                  <TableCell>{counts[r.slug] || 0}</TableCell>
                  <TableCell>
                    <Switch checked={r.active} onCheckedChange={() => toggleActive(r)} />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar módulo" : "Novo módulo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Slug</Label>
                <Input value={form.slug || ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={!!form.id} />
              </div>
              <div>
                <Label>Nome</Label>
                <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.billing_type} onValueChange={(v) => setForm({ ...form, billing_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Assinatura</SelectItem>
                    <SelectItem value="credits">Créditos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendas">Vendas</SelectItem>
                    <SelectItem value="gestao">Gestão</SelectItem>
                    <SelectItem value="comunicacao">Comunicação</SelectItem>
                    <SelectItem value="geral">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ícone (lucide)</Label>
                <Input value={form.icon || ""} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Preço mensal (centavos)</Label>
                <Input type="number" value={form.monthly_price_cents ?? 0}
                  onChange={(e) => setForm({ ...form, monthly_price_cents: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Preço crédito (cent.)</Label>
                <Input type="number" value={form.credit_price_cents ?? 0}
                  onChange={(e) => setForm({ ...form, credit_price_cents: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Trial (dias)</Label>
                <Input type="number" value={form.trial_days ?? 0}
                  onChange={(e) => setForm({ ...form, trial_days: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <Label>Stripe Price ID</Label>
              <Input value={form.stripe_price_id || ""} placeholder="price_..."
                onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })} />
            </div>
            <div>
              <Label>Features (uma por linha)</Label>
              <Textarea rows={4} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active ?? true} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
