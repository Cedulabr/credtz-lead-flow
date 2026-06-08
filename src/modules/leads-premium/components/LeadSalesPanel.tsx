import { useState } from \"react\";
import { Lead, HistoryEntry, PIPELINE_STAGES } from \"../types\";
import { WhatsAppSendDialog, type WhatsAppSentInfo } from \"@/components/WhatsAppSendDialog\";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from \"@/components/ui/sheet\";
import { Button } from \"@/components/ui/button\";
import { Badge } from \"@/components/ui/badge\";
import { ScrollArea } from \"@/components/ui/scroll-area\";
import { Separator } from \"@/components/ui/separator\";
import { Tabs, TabsContent, TabsList, TabsTrigger } from \"@/components/ui/tabs\";
import { Phone, MessageCircle, Send, History, FileText, X, CheckCircle2, AlertCircle, Clock } from \"lucide-react\";
import { cn } from \"@/lib/utils\";
import { useAuth } from \"@/contexts/AuthContext\";
import { supabase } from \"@/integrations/supabase/client\";
import { formatDistanceToNow } from \"date-fns\";
import { ptBR } from \"date-fns/locale\";
import { useToast } from \"@/hooks/use-toast\";

interface LeadSalesPanelProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (leadId: string, newStatus: string) => Promise<boolean>;
  onTyping: (lead: Lead) => void;
}

export function LeadSalesPanel({ lead, isOpen, onClose, onStatusChange, onTyping }: LeadSalesPanelProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<\"interacao\" | \"historico\">(\"interacao\");
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);

  if (!lead) return null;

  const config = PIPELINE_STAGES[lead.status] || PIPELINE_STAGES.new_lead;

  const history: HistoryEntry[] = lead.history 
    ? (typeof lead.history === 'string' ? JSON.parse(lead.history) : lead.history)
    : [];

  const formatPhone = (phone: string) => {
    if (!phone) return \"\";
    const clean = phone.replace(/\D/g, \"\");
    if (clean.length >= 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
    }
    return phone;
  };

  const handleWhatsApp = () => {
    setShowWhatsAppDialog(true);
  };

  const handleCall = (phone: string) => {
    window.open(`tel:+55${phone.replace(/\D/g, \"\")}`, \"_blank\");
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side=\"right\" className=\"w-full sm:max-w-md p-0 flex flex-col\">
        <SheetHeader className=\"p-4 border-b\">
          <div className=\"flex items-center justify-between\">
            <div>
              <SheetTitle className=\"text-lg font-bold\">{lead.name}</SheetTitle>
              <div className=\"flex items-center gap-2 mt-1\">
                <Badge variant=\"outline\" className={cn(\"text-[10px]\", config.bgColor, config.textColor, \"border-0\")}>
                  {config.label}
                </Badge>
                {lead.convenio && (
                  <Badge variant=\"secondary\" className=\"text-[10px]\">{lead.convenio}</Badge>
                )}
              </div>
            </div>
            <Button variant=\"ghost\" size=\"icon\" onClick={onClose}>
              <X className=\"h-4 w-4\" />
            </Button>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className=\"flex-1 flex flex-col\">
          <div className=\"px-4 pt-2 border-b\">
            <TabsList className=\"grid w-full grid-cols-2\">
              <TabsTrigger value=\"interacao\" className=\"flex items-center gap-2\">
                <MessageCircle className=\"h-4 w-4\" />
                Interação
              </TabsTrigger>
              <TabsTrigger value=\"historico\" className=\"flex items-center gap-2\">
                <History className=\"h-4 w-4\" />
                Histórico
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className=\"flex-1\">
            <TabsContent value=\"interacao\" className=\"p-4 mt-0 space-y-6\">
              {/* Telefones */}
              <div className=\"space-y-3\">
                <h3 className=\"text-sm font-semibold flex items-center gap-2\">
                  <Phone className=\"h-4 w-4 text-primary\" />
                  Canais de Contato
                </h3>
                <div className=\"space-y-2\">
                  <div className=\"flex items-center justify-between p-3 rounded-lg border bg-muted/30\">
                    <div className=\"flex flex-col\">
                      <span className=\"text-xs text-muted-foreground\">Principal</span>
                      <span className=\"font-medium\">{formatPhone(lead.phone)}</span>
                    </div>
                    <div className=\"flex gap-2\">
                      <Button size=\"icon\" variant=\"outline\" className=\"h-8 w-8\" onClick={() => handleCall(lead.phone)}>
                        <Phone className=\"h-4 w-4\" />
                      </Button>
                      <Button size=\"icon\" className=\"h-8 w-8 bg-green-600 hover:bg-green-700\" onClick={handleWhatsApp}>
                        <Send className=\"h-4 w-4 text-white\" />
                      </Button>
                    </div>
                  </div>
                  
                  {lead.phone2 && (
                    <div className=\"flex items-center justify-between p-3 rounded-lg border bg-muted/30\">
                      <div className=\"flex flex-col\">
                        <span className=\"text-xs text-muted-foreground\">Alternativo</span>
                        <span className=\"font-medium\">{formatPhone(lead.phone2)}</span>
                      </div>
                      <div className=\"flex gap-2\">
                        <Button size=\"icon\" variant=\"outline\" className=\"h-8 w-8\" onClick={() => handleCall(lead.phone2!)}>
                          <Phone className=\"h-4 w-4\" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Ações Rápidas */}
              <div className=\"space-y-3\">
                <h3 className=\"text-sm font-semibold flex items-center gap-2\">
                  <FileText className=\"h-4 w-4 text-primary\" />
                  Ações de Venda
                </h3>
                <div className=\"grid grid-cols-1 gap-2\">
                  <Button 
                    className=\"w-full justify-start h-12 bg-emerald-600 hover:bg-emerald-700 text-white\"
                    onClick={() => onTyping(lead)}
                  >
                    <FileText className=\"h-5 w-5 mr-3\" />
                    Digitar ao Cliente
                  </Button>
                  
                  <div className=\"grid grid-cols-2 gap-2 mt-2\">
                    <Button 
                      variant=\"outline\" 
                      className=\"h-10 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50\"
                      onClick={() => onStatusChange(lead.id, 'em_andamento')}
                    >
                      <Clock className=\"h-3.5 w-3.5 mr-2\" />
                      Em Andamento
                    </Button>
                    <Button 
                      variant=\"outline\" 
                      className=\"h-10 text-xs border-green-200 text-green-700 hover:bg-green-50\"
                      onClick={() => onStatusChange(lead.id, 'cliente_fechado')}
                    >
                      <CheckCircle2 className=\"h-3.5 w-3.5 mr-2\" />
                      Cliente Fechou
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />
              
              <div className=\"bg-primary/5 p-4 rounded-xl border border-primary/10\">
                <p className=\"text-xs text-primary font-medium mb-1 flex items-center gap-1\">
                  <AlertCircle className=\"h-3 w-3\" />
                  Dica de Venda
                </p>
                <p className=\"text-xs text-muted-foreground\">
                  Use os modelos de mensagens do WhatsApp para agilizar o primeiro contato e aumentar sua taxa de resposta.
                </p>
              </div>
            </TabsContent>

            <TabsContent value=\"historico\" className=\"p-4 mt-0\">
              {history.length === 0 ? (
                <div className=\"flex flex-col items-center justify-center py-12 text-muted-foreground\">
                  <History className=\"h-12 w-12 opacity-20 mb-2\" />
                  <p className=\"text-sm\">Sem histórico registrado</p>
                </div>
              ) : (
                <div className=\"relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent\">
                  {history.map((entry, idx) => (
                    <div key={idx} className=\"relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group\">
                      <div className=\"flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-hover:bg-primary transition-all duration-300 shrink-0\">
                        <Clock className=\"h-4 w-4 text-white\" />
                      </div>
                      <div className=\"w-[calc(100%-3rem)] bg-white p-4 rounded-xl border border-slate-200 shadow-sm ml-4\">
                        <div className=\"flex items-center justify-between space-x-2 mb-1\">
                          <div className=\"font-bold text-slate-900 text-sm\">{entry.action.replace(/_/g, ' ').toUpperCase()}</div>
                          <time className=\"text-xs text-muted-foreground\">
                            {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true, locale: ptBR })}
                          </time>
                        </div>
                        <div className=\"text-slate-500 text-xs\">
                          {entry.user_name && <span className=\"font-medium\">Por: {entry.user_name}</span>}
                          {entry.note && <p className=\"mt-1 italic\">\"{entry.note}\"</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* WhatsApp Send Dialog */}
        <WhatsAppSendDialog
          open={showWhatsAppDialog}
          onOpenChange={setShowWhatsAppDialog}
          clientName={lead.name}
          clientPhone={lead.phone}
          onSent={async (info: WhatsAppSentInfo) => {
            if (!user) return;
            const currentHistory = lead.history
              ? (typeof lead.history === 'string' ? JSON.parse(lead.history) : lead.history)
              : [];
            const newEntry = {
              action: 'whatsapp_sent',
              timestamp: new Date().toISOString(),
              user_id: user.id,
              user_name: profile?.name || profile?.email || '',
              whatsapp_instance: info.instanceName,
              whatsapp_number: info.instancePhone,
              sent_via: info.sentVia,
              message: info.message,
              audio_title: info.audioTitle || null,
              client_phone: info.clientPhone,
            };
            
            await supabase
              .from('leads')
              .update({ history: JSON.stringify([...currentHistory, newEntry]) } as any)
              .eq('id', lead.id);
            
            toast({ title: \"WhatsApp enviado e registrado!\" });
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
