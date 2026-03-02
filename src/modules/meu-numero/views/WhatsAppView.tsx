import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Loader2, CheckCircle, Info, PhoneForwarded } from "lucide-react";
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
  const [urlRetorno, setUrlRetorno] = useState("");

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
    if (!selectedDid || !urlRetorno) return;
    const result = await whatsappConfigurar(selectedDid, urlRetorno);
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
      {/* Passo a passo explicativo */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-5 w-5 text-blue-600" />
            Como vincular seu número ao WhatsApp Business
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-2">
            <p className="font-medium">📋 Pré-requisitos:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li>Ter um número virtual contratado (aba "Buscar Números")</li>
              <li>Configurar o <strong>Siga-me</strong> (aba "Configuração SIP") apontando para seu celular — isso permite que você receba a ligação de verificação do WhatsApp</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="font-medium">📞 Como funciona a verificação:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
              <li>Ao cadastrar o número virtual no WhatsApp Business, o WhatsApp faz uma <strong>ligação telefônica</strong> para o número</li>
              <li>Se o Siga-me estiver configurado, a ligação será redirecionada para seu celular</li>
              <li>Você receberá um <strong>código de verificação por voz</strong> durante a ligação</li>
              <li>Digite o código no WhatsApp Business para confirmar</li>
            </ol>
          </div>

          <div className="space-y-2">
            <p className="font-medium">🔗 URL de Retorno (Webhook):</p>
            <p className="text-muted-foreground">
              A URL de retorno é opcional e serve para receber automaticamente o áudio da ligação de verificação 
              em um sistema externo (ex: n8n, Make, servidor próprio). Se você <strong>não tem</strong> um 
              servidor/webhook, pode usar qualquer URL válida (ex: <code className="bg-muted px-1 rounded">https://exemplo.com/webhook</code>) 
              e receber o código diretamente pela ligação no seu celular via Siga-me.
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
              <PhoneForwarded className="h-4 w-4" />
              Importante
            </p>
            <p className="text-amber-600 dark:text-amber-500 text-xs mt-1">
              Configure o Siga-me ANTES de vincular ao WhatsApp. Sem ele, você não receberá a ligação de verificação.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Integração WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {selectedDidInfo && !selectedDidInfo.sip_destino && (
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">
                ⚠️ Este número não tem Siga-me configurado. Configure na aba "Configuração SIP" antes de vincular ao WhatsApp.
              </p>
            </div>
          )}

          <div>
            <Label>URL de Retorno (Webhook)</Label>
            <Input
              placeholder="https://seu-servidor.com/webhook/whatsapp"
              value={urlRetorno}
              onChange={(e) => setUrlRetorno(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              URL onde o sistema enviará o áudio da ligação de verificação. Se não tiver um webhook, 
              use qualquer URL válida e receba o código pela ligação no celular (via Siga-me).
            </p>
          </div>

          <Button onClick={handleConfigurar} disabled={!selectedDid || !urlRetorno || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <MessageCircle className="h-4 w-4 mr-1" />}
            Configurar WhatsApp
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
