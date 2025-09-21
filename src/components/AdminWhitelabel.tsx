import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Save, Image, Palette } from "lucide-react";

interface WhitelabelConfig {
  id: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  company_name: string | null;
}

export function AdminWhitelabel() {
  const { toast } = useToast();
  const [config, setConfig] = useState<WhitelabelConfig | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    primary_color: "#0066cc",
    secondary_color: "#00cc66"
  });

  useEffect(() => {
    fetchWhitelabelConfig();
  }, []);

  const fetchWhitelabelConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('whitelabel_config' as any)
        .select('*')
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        const configData = data as any;
        setConfig(configData);
        setForm({
          company_name: configData.company_name || "",
          primary_color: configData.primary_color || "#0066cc",
          secondary_color: configData.secondary_color || "#00cc66"
        });
      }
    } catch (error) {
      console.error('Error fetching whitelabel config:', error);
    }
  };

  const uploadFile = async (file: File, bucket: string, path: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return publicData.publicUrl;
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      let logoUrl = config?.logo_url;
      let faviconUrl = config?.favicon_url;

      // Upload logo if selected
      if (logoFile) {
        const timestamp = Date.now();
        logoUrl = await uploadFile(logoFile, 'Public', `whitelabel/logo-${timestamp}.png`);
      }

      // Upload favicon if selected
      if (faviconFile) {
        const timestamp = Date.now();
        faviconUrl = await uploadFile(faviconFile, 'Public', `whitelabel/favicon-${timestamp}.png`);
      }

      const configData = {
        logo_url: logoUrl,
        favicon_url: faviconUrl,
        company_name: form.company_name,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('whitelabel_config' as any)
        .upsert(configData);

      if (error) throw error;

      toast({
        title: "Configurações salvas!",
        description: "As configurações de whitelabel foram atualizadas.",
      });

      // Update favicon in document if changed
      if (faviconUrl) {
        const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (favicon) {
          favicon.href = faviconUrl;
        } else {
          const newFavicon = document.createElement('link');
          newFavicon.rel = 'icon';
          newFavicon.href = faviconUrl;
          document.head.appendChild(newFavicon);
        }
      }

      await fetchWhitelabelConfig();
      setLogoFile(null);
      setFaviconFile(null);

    } catch (error) {
      console.error('Error saving whitelabel config:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações de whitelabel.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Configurações Whitelabel</h2>
        <Palette className="h-6 w-6 text-primary" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Logo da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {config?.logo_url && (
              <div className="border rounded-lg p-4 text-center">
                <img 
                  src={config.logo_url} 
                  alt="Logo atual" 
                  className="mx-auto max-h-20 object-contain"
                />
                <p className="text-xs text-muted-foreground mt-2">Logo atual</p>
              </div>
            )}
            
            <div>
              <Label htmlFor="logo-upload">Selecionar nova logo</Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Recomendado: PNG/JPG, máximo 2MB
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Favicon Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Favicon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {config?.favicon_url && (
              <div className="border rounded-lg p-4 text-center">
                <img 
                  src={config.favicon_url} 
                  alt="Favicon atual" 
                  className="mx-auto w-8 h-8 object-contain"
                />
                <p className="text-xs text-muted-foreground mt-2">Favicon atual</p>
              </div>
            )}
            
            <div>
              <Label htmlFor="favicon-upload">Selecionar novo favicon</Label>
              <Input
                id="favicon-upload"
                type="file"
                accept="image/*"
                onChange={(e) => setFaviconFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Recomendado: PNG/JPG 32x32px
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="company-name">Nome da Empresa</Label>
              <Input
                id="company-name"
                placeholder="Ex: Sua Empresa"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="primary-color">Cor Primária</Label>
              <Input
                id="primary-color"
                type="color"
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="secondary-color">Cor Secundária</Label>
              <Input
                id="secondary-color"
                type="color"
                value={form.secondary_color}
                onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {(config?.logo_url || form.company_name) && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-6 text-center" 
                 style={{
                   backgroundColor: `${form.primary_color}10`,
                   borderColor: form.primary_color + '40'
                 }}>
              {config?.logo_url && (
                <img 
                  src={config.logo_url} 
                  alt="Logo preview" 
                  className="mx-auto max-h-16 object-contain mb-4"
                />
              )}
              <h3 className="font-bold text-xl" style={{ color: form.primary_color }}>
                {form.company_name || "Sua Empresa"}
              </h3>
              <p className="text-sm" style={{ color: form.secondary_color }}>
                Sistema de Gestão
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={handleSave} disabled={loading} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {loading ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
}