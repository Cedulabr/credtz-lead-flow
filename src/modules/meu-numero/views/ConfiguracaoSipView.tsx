import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, PhoneForwarded, PhoneOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBrDid } from "../hooks/useBrDid";
import { toast } from "sonner";
import type { UserDid } from "../types";

export function ConfiguracaoSipView() {
  const { user } = useAuth();
  const { loading, configurarSip, desconfigurarSip } = useBrDid();
  const [dids, setDids] = useState<UserDid[]>([]);
  const [selectedDid, setSelectedDid] = useState("");
  const [destino, setDestino] = useState("");

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
    if (!selectedDid || !destino) return;
    const result = await configurarSip(selectedDid, destino);
    if (result) {
      await supabase
        .from("user_dids")
        .update({ sip_destino: destino } as any)
        .eq("numero", selectedDid)
        .eq("user_id", user!.id);
      toast.success("Siga-me configurado com sucesso!");
      setDestino("");
      loadDids();
    }
  };

  const handleDesconfigurar = async () => {
    if (!selectedDid) return;
    const result = await desconfigurarSip(selectedDid);
    if (result) {
      await supabase
        .from("user_dids")
        .update({ sip_destino: null } as any)
        .eq("numero", selectedDid)
        .eq("user_id", user!.id);
      toast.success("Siga-me desconfigurado!");
      loadDids();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneForwarded className="h-5 w-5" />
            Configuração SIP (Siga-me)
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
                  <SelectItem key={d.id} value={d.numero}>{d.numero}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDidInfo?.sip_destino && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm">
                <strong>Siga-me ativo:</strong> {selectedDidInfo.sip_destino}
              </p>
              <Button variant="destructive" size="sm" className="mt-2" onClick={handleDesconfigurar} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <PhoneOff className="h-4 w-4 mr-1" />}
                Desconfigurar Siga-me
              </Button>
            </div>
          )}

          <div>
            <Label>Número de destino (com DDD)</Label>
            <Input
              placeholder="Ex: 11999998888"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
            />
          </div>

          <Button onClick={handleConfigurar} disabled={!selectedDid || !destino || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <PhoneForwarded className="h-4 w-4 mr-1" />}
            Configurar Siga-me
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
