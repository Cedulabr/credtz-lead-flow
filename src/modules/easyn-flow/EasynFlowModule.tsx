import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImageIcon, ShoppingCart, ExternalLink, LogIn, Loader2 } from "lucide-react";

interface ModuleSettings {
  title: string | null;
  subtitle: string | null;
  description: string | null;
  buy_url: string | null;
  learn_more_url: string | null;
  access_url: string | null;
  banner_image_url: string | null;
  is_enabled: boolean;
}

export const EasynFlowModule = () => {
  const [settings, setSettings] = useState<ModuleSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("module_settings" as any)
        .select("*")
        .eq("module_name", "easyn_flow")
        .maybeSingle();
      setSettings((data as any) ?? null);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings || !settings.is_enabled) return null;

  const open = (url: string | null, newTab = false) => {
    if (!url) return;
    if (newTab) window.open(url, "_blank", "noopener,noreferrer");
    else window.location.href = url;
  };

  return (
    <div className="p-4 md:p-8">
      <Card className="overflow-hidden border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Left content */}
          <div className="flex flex-col justify-center p-6 md:p-10 space-y-5">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                {settings.title || "Easyn Flow"}
              </h1>
              {settings.subtitle && (
                <p className="text-lg text-primary font-medium">{settings.subtitle}</p>
              )}
            </div>
            {settings.description && (
              <p className="text-muted-foreground leading-relaxed">{settings.description}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button size="lg" onClick={() => open(settings.buy_url)} disabled={!settings.buy_url}>
                <ShoppingCart className="h-4 w-4" />
                Comprar Agora
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => open(settings.learn_more_url, true)}
                disabled={!settings.learn_more_url}
              >
                <ExternalLink className="h-4 w-4" />
                Saiba Mais
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => open(settings.access_url, true)}
                disabled={!settings.access_url}
              >
                <LogIn className="h-4 w-4" />
                Acessar Sistema
              </Button>
            </div>
          </div>

          {/* Right image */}
          <div className="relative bg-muted/30 min-h-[260px] md:min-h-[420px] p-4 md:p-6 flex items-center justify-center">
            {settings.banner_image_url ? (
              <img
                src={settings.banner_image_url}
                alt={settings.title || "Easyn Flow"}
                className="w-full h-full object-cover rounded-2xl shadow-lg"
              />
            ) : (
              <div className="w-full h-full min-h-[240px] rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground shadow-inner">
                <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">Nenhuma imagem configurada</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EasynFlowModule;
