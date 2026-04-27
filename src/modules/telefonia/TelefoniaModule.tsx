import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone } from "lucide-react";
import { ConsultarTab } from "./components/ConsultarTab";
import { HistoricoTab } from "./components/HistoricoTab";
import { ConfiguracoesTab } from "./components/ConfiguracoesTab";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  leadContext?: { id: string; name: string } | null;
}

export default function TelefoniaModule({ leadContext }: Props) {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState("consultar");
  const [isGestor, setIsGestor] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("user_companies")
        .select("company_role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .eq("company_role", "gestor")
        .limit(1);
      setIsGestor(!!(data && data.length));
    })();
  }, [user?.id]);

  const canConfig = isAdmin || isGestor;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <header className="flex items-center gap-2">
        <Phone className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Telefonia</h1>
          <p className="text-xs text-muted-foreground">
            Consulta de telefones e perfil por CPF (Nova Vida TI)
          </p>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="consultar">Consultar</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          {canConfig && <TabsTrigger value="config">Configurações</TabsTrigger>}
        </TabsList>
        <TabsContent value="consultar" className="mt-4">
          <ConsultarTab leadContext={leadContext} onGoToConfig={() => setTab("config")} />
        </TabsContent>
        <TabsContent value="historico" className="mt-4">
          <HistoricoTab />
        </TabsContent>
        {canConfig && (
          <TabsContent value="config" className="mt-4">
            <ConfiguracoesTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
