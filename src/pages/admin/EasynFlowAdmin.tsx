import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Upload, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface FormState {
  title: string;
  subtitle: string;
  description: string;
  buy_url: string;
  learn_more_url: string;
  access_url: string;
  banner_image_url: string;
  is_enabled: boolean;
}

const empty: FormState = {
  title: "",
  subtitle: "",
  description: "",
  buy_url: "",
  learn_more_url: "",
  access_url: "",
  banner_image_url: "",
  is_enabled: true,
};

const EasynFlowAdmin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate("/");
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("module_settings" as any)
        .select("*")
        .eq("module_name", "easyn_flow")
        .maybeSingle();
      if (data) {
        const d = data as any;
        setForm({
          title: d.title ?? "",
          subtitle: d.subtitle ?? "",
          description: d.description ?? "",
          buy_url: d.buy_url ?? "",
          learn_more_url: d.learn_more_url ?? "",
          access_url: d.access_url ?? "",
          banner_image_url: d.banner_image_url ?? "",
          is_enabled: d.is_enabled ?? true,
        });
      }
      setLoading(false);
    })();
  }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `easyn_flow/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("module-banners")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (error) throw error;
      const { data } = supabase.storage.from("module-banners").getPublicUrl(path);
      setForm((f) => ({ ...f, banner_image_url: data.publicUrl }));
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error("Erro ao enviar: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("module_settings" as any)
        .upsert(
          { module_name: "easyn_flow", ...form },
          { onConflict: "module_name" }
        );
      if (error) throw error;
      toast.success("Configurações salvas");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Easyn Flow — Configuração</h1>
            <p className="text-sm text-muted-foreground">Configure o módulo promocional Easyn Flow</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Visibilidade</CardTitle>
            <CardDescription>Ative ou desative o módulo para os usuários</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">Módulo ativo</Label>
              <Switch
                id="enabled"
                checked={form.is_enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_enabled: v }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conteúdo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links dos botões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL — Comprar Agora</Label>
              <Input value={form.buy_url} onChange={(e) => setForm({ ...form, buy_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>URL — Saiba Mais (abre em nova aba)</Label>
              <Input value={form.learn_more_url} onChange={(e) => setForm({ ...form, learn_more_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>URL — Acessar Sistema</Label>
              <Input value={form.access_url} onChange={(e) => setForm({ ...form, access_url: e.target.value })} placeholder="https://..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Imagem do banner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-video w-full rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
              {form.banner_image_url ? (
                <img src={form.banner_image_url} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center">
                  <ImageIcon className="h-10 w-10 opacity-50" />
                  <p className="text-sm mt-1">Nenhuma imagem</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild isLoading={uploading} loadingText="Enviando...">
                <label className="cursor-pointer">
                  <Upload className="h-4 w-4" />
                  Enviar imagem
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                    }}
                  />
                </label>
              </Button>
              {form.banner_image_url && (
                <Button variant="ghost" onClick={() => setForm({ ...form, banner_image_url: "" })}>
                  Remover
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 sticky bottom-4">
          <Button onClick={handleSave} isLoading={saving} loadingText="Salvando..." size="lg">
            Salvar alterações
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EasynFlowAdmin;
