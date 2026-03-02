import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Phone, PhoneForwarded, MessageCircle, CreditCard, BarChart3 } from "lucide-react";
import { BuscarNumerosView } from "./views/BuscarNumerosView";
import { MeusNumerosView } from "./views/MeusNumerosView";
import { ConfiguracaoSipView } from "./views/ConfiguracaoSipView";
import { WhatsAppView } from "./views/WhatsAppView";
import { BillingView } from "./views/BillingView";
import { LogsChamadasView } from "./views/LogsChamadasView";

export function MeuNumeroModule() {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">📞 Meu Número</h1>
        <p className="text-muted-foreground">Gerencie seus números virtuais (DID)</p>
      </div>

      <Tabs defaultValue="buscar" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1">
          <TabsTrigger value="buscar" className="flex items-center gap-1 text-xs sm:text-sm">
            <Search className="h-3.5 w-3.5" /> Buscar
          </TabsTrigger>
          <TabsTrigger value="meus" className="flex items-center gap-1 text-xs sm:text-sm">
            <Phone className="h-3.5 w-3.5" /> Meus Números
          </TabsTrigger>
          <TabsTrigger value="sip" className="flex items-center gap-1 text-xs sm:text-sm">
            <PhoneForwarded className="h-3.5 w-3.5" /> SIP
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-1 text-xs sm:text-sm">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-1 text-xs sm:text-sm">
            <CreditCard className="h-3.5 w-3.5" /> Billing
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1 text-xs sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5" /> Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buscar"><BuscarNumerosView /></TabsContent>
        <TabsContent value="meus"><MeusNumerosView /></TabsContent>
        <TabsContent value="sip"><ConfiguracaoSipView /></TabsContent>
        <TabsContent value="whatsapp"><WhatsAppView /></TabsContent>
        <TabsContent value="billing"><BillingView /></TabsContent>
        <TabsContent value="logs"><LogsChamadasView /></TabsContent>
      </Tabs>
    </div>
  );
}
