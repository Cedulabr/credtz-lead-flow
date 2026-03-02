import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBrDid } from "../hooks/useBrDid";
import { toast } from "sonner";
import type { UserDid } from "../types";

export function WhatsAppView() {
  const { user } = useAuth();
  const { loading, whatsappConfigurar } = useBrDid();
  const [dids, setDids] = useState<UserDid[]>([]);
  const [selectedDid, setSelectedDid] = useState("");
  const [webhook, setWebhook] = useState("");

  useEffect(() => {
    if (user?.id) loadDids();
  }, [user?.id]);

  const loadDids = async () => {
    const { data } = await supabase
      .from("user_dids")
      .select("*")
      .eq("user_id", user!.id)
      .eq("status", "active");
    if (data) setDids(data as unknown as UserDid[]);
  };

  const selectedDidInfo = dids.find(d => d.numero === selectedDid);

  const handleConfigurar = async () => {
    if (!selectedDid || !webhook) return;
    const result = await whatsappConfigurar(selectedDid, webhook);
    if (result) {
      await supabase
        .from("user_dids")
        .update({ whatsapp_configured: true } as any)
        .eq("numero", selectedDid)
        .eq("user_id", user!.id);
      toast.success("WhatsApp configurado com sucesso!");
      loadDids();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Integração WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure um webhook para receber o código de verificação do WhatsApp Business no seu número virtual.
          </p>

          <div>
            <Label>Selecione o número</Label>
            <Select value={selectedDid} onValueChange={setSelectedDid}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um DID ativo..." />
              </SelectTrigger>
              <SelectContent>
                {dids.map(d => (
                  <SelectItem key={d.id} value={d.numero}>
                    {d.numero}
                    {d.whatsapp_configured && " ✅"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDidInfo?.whatsapp_configured && (
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-400">WhatsApp já configurado neste número</span>
            </div>
          )}

          <div>
            <Label>URL do Webhook</Label>
            <Input
              placeholder="https://seu-webhook.com/whatsapp"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              O código de verificação do WhatsApp será enviado para este endpoint.
            </p>
          </div>

          <Button onClick={handleConfigurar} disabled={!selectedDid || !webhook || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <MessageCircle className="h-4 w-4 mr-1" />}
            Configurar WhatsApp
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
