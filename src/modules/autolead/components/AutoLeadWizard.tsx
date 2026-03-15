import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CompactStepIndicator } from "@/components/ui/form-wizard";
import { ChevronLeft, ChevronRight, Check, Loader2, Zap, MessageSquare, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhatsApp, type WhatsAppInstance } from "@/hooks/useWhatsApp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_MESSAGE, TIPOS_LEAD, FEATURED_DDDS, QUANTITY_PRESETS, SMS_TEMPLATES, type WizardData } from "../types";

interface AutoLeadWizardProps {
  open: boolean;
  onClose: () => void;
  credits: number;
  onConfirm: (data: WizardData) => Promise<void>;
}

export function AutoLeadWizard({ open, onClose, credits, onConfirm }: AutoLeadWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const { instances, loadingInstances } = useWhatsApp();

  const [smsCredits, setSmsCredits] = useState<number | null>(null);
  const [loadingSmsCredits, setLoadingSmsCredits] = useState(true);

  const [data, setData] = useState<WizardData>({
    quantidade: Math.min(10, credits),
    ddds: [],
    tipoLead: null,
    useDefaultMessage: true,
    messageTemplate: DEFAULT_MESSAGE,
    whatsappInstanceIds: [],
    smsEnabled: true,
    smsTemplate: SMS_TEMPLATES[0].template,
  });

  const totalSteps = 7;
  const connectedInstances = instances.filter(i => i.hasToken);

  // Fetch SMS credits from the gestor of the user's company
  const fetchSmsCredits = useCallback(async () => {
    if (!user?.id) return;
    setLoadingSmsCredits(true);
    try {
      // Get user's company and gestor
      const { data: ucData } = await supabase
        .from("user_companies")
        .select("company_id, company_role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!ucData?.company_id) {
        setSmsCredits(0);
        setLoadingSmsCredits(false);
        return;
      }

      // Find gestor of the company
      let gestorId = user.id;
      if (ucData.company_role !== 'gestor') {
        const { data: gestorData } = await supabase
          .from("user_companies")
          .select("user_id")
          .eq("company_id", ucData.company_id)
          .eq("company_role", "gestor")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        if (gestorData?.user_id) {
          gestorId = gestorData.user_id;
        }
      }

      // Get SMS credits of the gestor
      const { data: creditData } = await supabase
        .from("sms_credits")
        .select("credits_balance")
        .eq("user_id", gestorId)
        .maybeSingle();

      setSmsCredits(creditData?.credits_balance ?? 0);
    } catch {
      setSmsCredits(0);
    }
    setLoadingSmsCredits(false);
  }, [user?.id]);

  useEffect(() => {
    if (open) fetchSmsCredits();
  }, [open, fetchSmsCredits]);

  // Auto-disable SMS if no credits
  useEffect(() => {
    if (smsCredits !== null && smsCredits <= 0) {
      setData(prev => ({ ...prev, smsEnabled: false }));
    }
  }, [smsCredits]);

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return data.quantidade > 0 && data.quantidade <= credits;
      case 1: return true;
      case 2: return !!data.tipoLead;
      case 3: return data.useDefaultMessage || data.messageTemplate.trim().length > 10;
      case 4: return true; // SMS step — optional
      case 5: return data.whatsappInstanceIds.length > 0;
      case 6: return true;
      default: return false;
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(data);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDdd = (ddd: string) => {
    setData(prev => ({
      ...prev,
      ddds: prev.ddds.includes(ddd) ? prev.ddds.filter(d => d !== ddd) : [...prev.ddds, ddd],
    }));
  };

  const toggleInstance = (id: string) => {
    setData(prev => ({
      ...prev,
      whatsappInstanceIds: prev.whatsappInstanceIds.includes(id)
        ? prev.whatsappInstanceIds.filter(i => i !== id)
        : [...prev.whatsappInstanceIds, id],
    }));
  };

  // Get WhatsApp phone for preview
  const getWhatsAppPhone = () => {
    if (data.whatsappInstanceIds.length === 0) return "(seu WhatsApp)";
    const inst = connectedInstances.find(i => data.whatsappInstanceIds.includes(i.id));
    return inst?.phone_number || "(seu WhatsApp)";
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">Você possui</p>
              <p className="text-3xl font-bold text-primary">{credits}</p>
              <p className="text-sm text-muted-foreground">créditos disponíveis</p>
            </div>
            <div>
              <Label className="text-sm">Quantos leads deseja utilizar?</Label>
              <Input
                type="number"
                min={1}
                max={credits}
                value={data.quantidade}
                onChange={e => setData(prev => ({ ...prev, quantidade: Math.min(Number(e.target.value), credits) }))}
                className="mt-2 text-center text-lg font-semibold"
              />
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUANTITY_PRESETS.filter(q => q <= credits).map(q => (
                <Button
                  key={q}
                  variant={data.quantidade === q ? "default" : "outline"}
                  size="sm"
                  onClick={() => setData(prev => ({ ...prev, quantidade: q }))}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Selecione o DDD dos clientes (opcional)</p>
            <div className="grid grid-cols-2 gap-2">
              {FEATURED_DDDS.map(({ ddd, city }) => (
                <Card
                  key={ddd}
                  className={cn(
                    "cursor-pointer transition-all",
                    data.ddds.includes(ddd) ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                  onClick={() => toggleDdd(ddd)}
                >
                  <CardContent className="p-3 flex items-center gap-2">
                    <Checkbox checked={data.ddds.includes(ddd)} />
                    <div>
                      <p className="font-semibold text-sm">{ddd}</p>
                      <p className="text-xs text-muted-foreground">{city}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Selecione a TAG do lead</p>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_LEAD.map(tipo => (
                <Card
                  key={tipo.id}
                  className={cn(
                    "cursor-pointer transition-all",
                    data.tipoLead === tipo.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                  onClick={() => setData(prev => ({ ...prev, tipoLead: tipo.id }))}
                >
                  <CardContent className="p-3 text-center space-y-1">
                    <span className="text-2xl">{tipo.icon}</span>
                    <p className="font-medium text-sm">{tipo.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Mensagem de saudação (WhatsApp)</p>
            <RadioGroup
              value={data.useDefaultMessage ? "default" : "custom"}
              onValueChange={v => setData(prev => ({ ...prev, useDefaultMessage: v === "default" }))}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="default" id="default" />
                <Label htmlFor="default" className="text-sm">Usar mensagem padrão</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="text-sm">Personalizar mensagem</Label>
              </div>
            </RadioGroup>

            {!data.useDefaultMessage && (
              <div className="space-y-2">
                <Textarea
                  value={data.messageTemplate}
                  onChange={e => setData(prev => ({ ...prev, messageTemplate: e.target.value }))}
                  rows={6}
                  placeholder="Digite sua mensagem..."
                />
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs cursor-pointer"
                    onClick={() => setData(prev => ({ ...prev, messageTemplate: prev.messageTemplate + " {{nome}}" }))}>
                    {"{{nome}}"}
                  </Badge>
                  <Badge variant="secondary" className="text-xs cursor-pointer"
                    onClick={() => setData(prev => ({ ...prev, messageTemplate: prev.messageTemplate + " {{cidade}}" }))}>
                    {"{{cidade}}"}
                  </Badge>
                  <Badge variant="secondary" className="text-xs cursor-pointer"
                    onClick={() => setData(prev => ({ ...prev, messageTemplate: prev.messageTemplate + " {{beneficio}}" }))}>
                    {"{{beneficio}}"}
                  </Badge>
                </div>
              </div>
            )}

            {data.useDefaultMessage && (
              <Card className="bg-muted/50">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{DEFAULT_MESSAGE}</p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      // NEW: SMS Step
      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <Label className="text-sm font-medium">Enviar também via SMS?</Label>
              </div>
              <Switch
                checked={data.smsEnabled}
                onCheckedChange={checked => setData(prev => ({ ...prev, smsEnabled: checked }))}
                disabled={smsCredits !== null && smsCredits <= 0}
              />
            </div>

            {/* Credits info */}
            {loadingSmsCredits ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Verificando créditos SMS...
              </div>
            ) : smsCredits !== null && smsCredits <= 0 ? (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Sem créditos SMS</p>
                    <p className="text-xs text-muted-foreground">O gestor da sua empresa não possui créditos SMS. Solicite ao administrador.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="text-xs text-muted-foreground">
                Créditos SMS disponíveis: <span className="font-semibold text-primary">{smsCredits}</span>
                {data.smsEnabled && data.quantidade > (smsCredits || 0) && (
                  <span className="text-amber-600 ml-1">
                    (apenas {smsCredits} de {data.quantidade} leads receberão SMS)
                  </span>
                )}
              </p>
            )}

            {data.smsEnabled && (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Escolha um modelo de SMS:</p>
                  <div className="space-y-2">
                    {SMS_TEMPLATES.map(tmpl => (
                      <Card
                        key={tmpl.id}
                        className={cn(
                          "cursor-pointer transition-all",
                          data.smsTemplate === tmpl.template ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        )}
                        onClick={() => setData(prev => ({ ...prev, smsTemplate: tmpl.template }))}
                      >
                        <CardContent className="p-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <span>{tmpl.icon}</span>
                            <p className="font-medium text-sm">{tmpl.label}</p>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.template}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Texto do SMS (editável)</Label>
                  <Textarea
                    value={data.smsTemplate}
                    onChange={e => setData(prev => ({ ...prev, smsTemplate: e.target.value }))}
                    rows={4}
                    placeholder="Digite o texto do SMS..."
                  />
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs cursor-pointer"
                      onClick={() => setData(prev => ({ ...prev, smsTemplate: prev.smsTemplate + " {{nome}}" }))}>
                      {"{{nome}}"}
                    </Badge>
                    <Badge variant="secondary" className="text-xs cursor-pointer"
                      onClick={() => setData(prev => ({ ...prev, smsTemplate: prev.smsTemplate + " {{whatsapp}}" }))}>
                      {"{{whatsapp}}"}
                    </Badge>
                  </div>
                </div>

                {/* Preview */}
                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <p className="text-xs font-medium mb-1 text-muted-foreground">Preview:</p>
                    <p className="text-xs whitespace-pre-line">
                      {data.smsTemplate
                        .replace(/\{\{nome\}\}/g, "João Silva")
                        .replace(/\{\{whatsapp\}\}/g, getWhatsAppPhone())}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Selecione os WhatsApps para envio (mínimo 1)</p>
            {loadingInstances ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : connectedInstances.length === 0 ? (
              <Card className="border-destructive/30">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-destructive">Nenhum WhatsApp conectado.</p>
                  <p className="text-xs text-muted-foreground mt-1">Configure um WhatsApp antes de continuar.</p>
                </CardContent>
              </Card>
            ) : (
              connectedInstances.map(inst => (
                <Card
                  key={inst.id}
                  className={cn(
                    "cursor-pointer transition-all",
                    data.whatsappInstanceIds.includes(inst.id) ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                  onClick={() => toggleInstance(inst.id)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <Checkbox checked={data.whatsappInstanceIds.includes(inst.id)} />
                    <div>
                      <p className="font-medium text-sm">{inst.instance_name}</p>
                      {inst.phone_number && <p className="text-xs text-muted-foreground">{inst.phone_number}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <p className="text-sm font-medium text-center">Resumo da prospecção</p>
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Leads:</span><span className="font-semibold">{data.quantidade}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">DDDs:</span><span className="font-semibold">{data.ddds.length > 0 ? data.ddds.join(", ") : "Todos"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">TAG:</span><span className="font-semibold">{TIPOS_LEAD.find(t => t.id === data.tipoLead)?.label || "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mensagem WA:</span><span className="font-semibold">{data.useDefaultMessage ? "Padrão" : "Personalizada"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">WhatsApps:</span><span className="font-semibold">{data.whatsappInstanceIds.length}</span></div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SMS:</span>
                  <span className={cn("font-semibold", data.smsEnabled ? "text-primary" : "text-muted-foreground")}>
                    {data.smsEnabled ? `Ativo (${Math.min(data.quantidade, smsCredits || 0)} envios)` : "Desativado"}
                  </span>
                </div>
              </CardContent>
            </Card>
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>⏱ WhatsApp: delay aleatório de 2-7 min</p>
              <p>📱 SMS: envio imediato (sem delay)</p>
              <p>🔄 Rotação automática entre WhatsApps</p>
              <p>⏸ Pausa automática a cada 10 mensagens</p>
              <p>🕐 Janela de envio WA: 08:30 - 18:30</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = ["Créditos", "DDD", "TAG", "Mensagem WA", "SMS", "WhatsApp", "Confirmar"];

  return (
    <Sheet open={open} onOpenChange={() => !submitting && onClose()}>
      <SheetContent side="bottom" className="h-auto max-h-[calc(100dvh-2rem)] rounded-t-2xl flex flex-col">
        <SheetHeader className="pb-1 shrink-0">
          <SheetTitle className="text-base">{stepTitles[step]}</SheetTitle>
          <CompactStepIndicator currentStep={step} totalSteps={totalSteps} />
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-3 min-h-0">
          {renderStep()}
        </div>

        <div className="flex gap-2 pt-3 pb-[env(safe-area-inset-bottom,0.5rem)] border-t shrink-0">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={submitting} className="flex-1 h-11">
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          )}
          {step < totalSteps - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="flex-1 h-11">
              Continuar <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={submitting || !canProceed()} className="flex-1 h-11 gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {submitting ? "Processando..." : "Iniciar Prospecção"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
