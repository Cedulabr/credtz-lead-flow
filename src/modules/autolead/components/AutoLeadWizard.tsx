import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CompactStepIndicator } from "@/components/ui/form-wizard";
import { ChevronLeft, ChevronRight, Check, Loader2, Zap, MessageSquare, AlertTriangle, ChevronDown, Smartphone, Phone, Music, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioFiles } from "@/modules/audios/hooks/useAudioFiles";
import {
  DEFAULT_MESSAGE, TIPOS_LEAD, FEATURED_DDDS, ALL_DDDS, DDD_CITIES,
  QUANTITY_PRESETS, SMS_TEMPLATES, WHATSAPP_TEMPLATES, type WizardData
} from "../types";

interface AutoLeadWizardProps {
  open: boolean;
  onClose: () => void;
  credits: number;
  onConfirm: (data: WizardData) => Promise<void>;
}

export function AutoLeadWizard({ open, onClose, credits, onConfirm }: AutoLeadWizardProps) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const { instances, loadingInstances } = useWhatsApp();
  const { audios, loading: loadingAudios, getPublicUrl } = useAudioFiles();
  const [showAllDdds, setShowAllDdds] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const [smsCredits, setSmsCredits] = useState<number | null>(null);
  const [loadingSmsCredits, setLoadingSmsCredits] = useState(true);
  const [isGestor, setIsGestor] = useState(false);

  const [data, setData] = useState<WizardData>({
    quantidade: Math.min(10, credits),
    ddds: [],
    tags: [],
    tipoLead: null,
    useDefaultMessage: true,
    messageTemplate: DEFAULT_MESSAGE,
    whatsappInstanceIds: [],
    smsEnabled: true,
    smsTemplate: SMS_TEMPLATES[0].template,
  });

  const totalSteps = 6;
  const connectedInstances = instances.filter(i => i.hasToken);
  const extraDdds = ALL_DDDS.filter(d => !FEATURED_DDDS.includes(d));

  // Fetch available tags from leads_database
  useEffect(() => {
    if (!open) return;
    const fetchTags = async () => {
      const { data: tagData } = await supabase
        .from("leads_database")
        .select("tag")
        .not("tag", "is", null)
        .eq("is_available", true)
        .limit(500);
      if (tagData) {
        const unique = [...new Set(tagData.map((l: any) => l.tag).filter(Boolean))] as string[];
        setAvailableTags(unique);
      }
    };
    fetchTags();
  }, [open]);

  // Fetch SMS credits (admin bypasses user_companies)
  const fetchSmsCredits = useCallback(async () => {
    if (!user?.id) return;
    setLoadingSmsCredits(true);
    try {
      // Admin: busca direto na sms_credits com próprio user_id
      if (profile?.role === 'admin') {
        const { data: creditData } = await supabase
          .from("sms_credits")
          .select("credits_balance")
          .eq("user_id", user.id)
          .maybeSingle();
        setSmsCredits(creditData?.credits_balance ?? 0);
        setIsGestor(true);
        setLoadingSmsCredits(false);
        return;
      }

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

      setIsGestor(ucData.company_role === 'gestor');

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
        if (gestorData?.user_id) gestorId = gestorData.user_id;
      }

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
  }, [user?.id, profile?.role]);

  useEffect(() => {
    if (open) fetchSmsCredits();
  }, [open, fetchSmsCredits]);

  useEffect(() => {
    if (smsCredits !== null && smsCredits <= 0) {
      setData(prev => ({ ...prev, smsEnabled: false }));
    }
  }, [smsCredits]);

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return data.quantidade > 0 && data.quantidade <= credits;
      case 1: return true; // DDD + Tags optional
      case 2: return data.useDefaultMessage || data.messageTemplate.trim().length > 10;
      case 3: return true; // SMS optional
      case 4: return data.whatsappInstanceIds.length > 0;
      case 5: return true;
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

  const toggleTag = (tag: string) => {
    setData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
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

  const getWhatsAppPhone = () => {
    if (data.whatsappInstanceIds.length === 0) return "(11) 99999-9999";
    const inst = connectedInstances.find(i => data.whatsappInstanceIds.includes(i.id));
    return inst?.phone_number || "(11) 99999-9999";
  };

  const renderPreviewMessage = (template: string) => {
    return template
      .replace(/\{\{nome\}\}/g, "João Silva")
      .replace(/\{\{whatsapp\}\}/g, getWhatsAppPhone())
      .replace(/\{\{cidade\}\}/g, "São Paulo")
      .replace(/\{\{beneficio\}\}/g, "INSS");
  };

  const renderStep = () => {
    switch (step) {
      // Step 0: Quantidade
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

      // Step 1: DDD + TAG (merged)
      case 1:
        return (
          <div className="space-y-5">
            {/* DDD Section */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Selecione o DDD dos clientes <span className="text-muted-foreground font-normal">(opcional)</span></p>
              <div className="grid grid-cols-5 gap-1.5">
                {FEATURED_DDDS.map(ddd => (
                  <button
                    key={ddd}
                    onClick={() => toggleDdd(ddd)}
                    className={cn(
                      "rounded-lg border p-2 text-center transition-all text-sm",
                      data.ddds.includes(ddd)
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <span className="font-semibold">{ddd}</span>
                    <span className="block text-[10px] text-muted-foreground truncate">{DDD_CITIES[ddd]}</span>
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => setShowAllDdds(!showAllDdds)}
              >
                {showAllDdds ? "Ocultar" : "Ver mais DDDs"}
                <ChevronDown className={cn("h-3 w-3 ml-1 transition-transform", showAllDdds && "rotate-180")} />
              </Button>

              {showAllDdds && (
                <ScrollArea className="h-40">
                  <div className="grid grid-cols-5 gap-1.5">
                    {extraDdds.map(ddd => (
                      <button
                        key={ddd}
                        onClick={() => toggleDdd(ddd)}
                        className={cn(
                          "rounded-lg border p-1.5 text-center transition-all text-xs",
                          data.ddds.includes(ddd)
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        {ddd}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {data.ddds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {data.ddds.map(ddd => (
                    <Badge key={ddd} variant="secondary" className="text-xs cursor-pointer" onClick={() => toggleDdd(ddd)}>
                      {ddd} ✕
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* TAG Section */}
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium">Selecione a TAG do lead <span className="text-muted-foreground font-normal">(opcional)</span></p>
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
                    <CardContent className="p-2.5 text-center space-y-0.5">
                      <span className="text-xl">{tipo.icon}</span>
                      <p className="font-medium text-xs">{tipo.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {availableTags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Tags disponíveis:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTags.map(tag => (
                      <Badge
                        key={tag}
                        variant={data.tags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      // Step 2: Mensagem WhatsApp (templates selecionáveis)
      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Escolha o modelo da mensagem WhatsApp:</p>

            <div className="space-y-2">
              {WHATSAPP_TEMPLATES.map(tmpl => (
                <Card
                  key={tmpl.id}
                  className={cn(
                    "cursor-pointer transition-all",
                    data.useDefaultMessage && data.messageTemplate === tmpl.template
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => setData(prev => ({
                    ...prev,
                    useDefaultMessage: true,
                    messageTemplate: tmpl.template,
                  }))}
                >
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span>{tmpl.icon}</span>
                      <p className="font-medium text-sm">{tmpl.label}</p>
                      {data.useDefaultMessage && data.messageTemplate === tmpl.template && (
                        <Check className="h-4 w-4 text-primary ml-auto" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.template}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card
              className={cn(
                "cursor-pointer transition-all",
                !data.useDefaultMessage ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              )}
              onClick={() => setData(prev => ({ ...prev, useDefaultMessage: false }))}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <span>✏️</span>
                  <p className="font-medium text-sm">Personalizar mensagem</p>
                  {!data.useDefaultMessage && <Check className="h-4 w-4 text-primary ml-auto" />}
                </div>
              </CardContent>
            </Card>

            {!data.useDefaultMessage && (
              <div className="space-y-2">
                <Textarea
                  value={data.messageTemplate}
                  onChange={e => setData(prev => ({ ...prev, messageTemplate: e.target.value }))}
                  rows={5}
                  placeholder="Digite sua mensagem..."
                />
                <div className="flex flex-wrap gap-1">
                  {["{{nome}}", "{{cidade}}", "{{beneficio}}"].map(v => (
                    <Badge key={v} variant="secondary" className="text-xs cursor-pointer"
                      onClick={() => setData(prev => ({ ...prev, messageTemplate: prev.messageTemplate + " " + v }))}>
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Audio section */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="h-5 w-5 text-primary" />
                  <Label className="text-sm font-medium">Incluir áudio na mensagem</Label>
                </div>
                <Switch
                  checked={!!data.audioFileId}
                  onCheckedChange={checked => {
                    if (!checked) {
                      if (audioElement) { audioElement.pause(); setAudioElement(null); }
                      setPlayingAudioId(null);
                      setData(prev => ({ ...prev, audioFileId: undefined, audioTitle: undefined }));
                    }
                  }}
                  disabled={audios.length === 0}
                />
              </div>

              {audios.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum áudio disponível. Cadastre áudios no módulo Áudios.</p>
              )}

              {(data.audioFileId || audios.length > 0) && (
                <div className="space-y-2">
                  {loadingAudios ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Carregando áudios...
                    </div>
                  ) : (
                    audios.map(audio => (
                      <Card
                        key={audio.id}
                        className={cn(
                          "cursor-pointer transition-all",
                          data.audioFileId === audio.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        )}
                        onClick={() => {
                          setData(prev => ({
                            ...prev,
                            audioFileId: prev.audioFileId === audio.id ? undefined : audio.id,
                            audioTitle: prev.audioFileId === audio.id ? undefined : audio.title,
                          }));
                        }}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <Checkbox checked={data.audioFileId === audio.id} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{audio.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {audio.file_size ? `${(audio.file_size / 1024).toFixed(0)} KB` : 'Áudio'}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={e => {
                              e.stopPropagation();
                              if (playingAudioId === audio.id && audioElement) {
                                audioElement.pause();
                                setPlayingAudioId(null);
                                setAudioElement(null);
                              } else {
                                if (audioElement) audioElement.pause();
                                const url = getPublicUrl(audio.file_path);
                                const el = new Audio(url);
                                el.play();
                                el.onended = () => { setPlayingAudioId(null); setAudioElement(null); };
                                setPlayingAudioId(audio.id);
                                setAudioElement(el);
                              }
                            }}
                          >
                            {playingAudioId === audio.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  )}
                  <p className="text-xs text-muted-foreground">O áudio será enviado logo após a mensagem de texto.</p>
                </div>
              )}
            </div>
          </div>
        );

      // Step 3: SMS
      case 3:
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

            {loadingSmsCredits ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Verificando créditos SMS...
              </div>
            ) : smsCredits !== null && smsCredits <= 0 ? (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        Você está prospectando apenas via WhatsApp
                      </p>
                      <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">
                        Adicionar SMS pode aumentar sua taxa de resposta em até <span className="font-bold">40%</span>.
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    {isGestor
                      ? "Adquira créditos SMS para potencializar seus resultados."
                      : "Solicite créditos SMS ao seu gestor."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <p className="text-xs text-muted-foreground">
                Créditos SMS: <span className="font-semibold text-primary">{smsCredits}</span>
                {data.smsEnabled && data.quantidade > (smsCredits || 0) && (
                  <span className="text-destructive/80 ml-1">(apenas {smsCredits} receberão SMS)</span>
                )}
              </p>
            )}

            {data.smsEnabled && (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Escolha um modelo:</p>
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
                          {data.smsTemplate === tmpl.template && <Check className="h-4 w-4 text-primary ml-auto" />}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.template}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Texto do SMS (editável)</Label>
                  <Textarea
                    value={data.smsTemplate}
                    onChange={e => setData(prev => ({ ...prev, smsTemplate: e.target.value }))}
                    rows={3}
                  />
                  <div className="flex flex-wrap gap-1">
                    {["{{nome}}", "{{whatsapp}}"].map(v => (
                      <Badge key={v} variant="secondary" className="text-xs cursor-pointer"
                        onClick={() => setData(prev => ({ ...prev, smsTemplate: prev.smsTemplate + " " + v }))}>
                        {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        );

      // Step 4: WhatsApp instances
      case 4:
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

      // Step 5: Resumo + Preview
      case 5:
        return (
          <div className="space-y-4">
            <p className="text-sm font-medium text-center">Resumo da prospecção</p>
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Leads:</span><span className="font-semibold">{data.quantidade}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">DDDs:</span><span className="font-semibold">{data.ddds.length > 0 ? data.ddds.join(", ") : "Todos"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">TAG:</span><span className="font-semibold">{TIPOS_LEAD.find(t => t.id === data.tipoLead)?.label || "Todos"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">WhatsApps:</span><span className="font-semibold">{data.whatsappInstanceIds.length}</span></div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SMS:</span>
                  <span className={cn("font-semibold", data.smsEnabled ? "text-primary" : "text-muted-foreground")}>
                    {data.smsEnabled ? `Ativo (${Math.min(data.quantidade, smsCredits || 0)} envios)` : "Desativado"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Áudio:</span>
                  <span className={cn("font-semibold", data.audioFileId ? "text-primary" : "text-muted-foreground")}>
                    {data.audioFileId ? `🎵 ${data.audioTitle || 'Selecionado'}` : "Desativado"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Message Preview */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-center">📱 Como o lead vai receber</p>

              {/* WhatsApp Preview */}
              <div className="rounded-lg overflow-hidden border">
                <div className="bg-[#075e54] px-3 py-2 flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-white" />
                  <span className="text-xs font-medium text-white">WhatsApp</span>
                </div>
                <div className="bg-[#e5ddd5] dark:bg-[#0b141a] p-3 min-h-[80px]">
                  <div className="max-w-[85%] ml-auto bg-[#dcf8c6] dark:bg-[#005c4b] rounded-lg rounded-tr-none p-2.5 shadow-sm">
                    <p className="text-xs text-[#111b21] dark:text-[#e9edef] whitespace-pre-line leading-relaxed">
                      {renderPreviewMessage(data.messageTemplate)}
                    </p>
                    <p className="text-[10px] text-[#667781] dark:text-[#8696a0] text-right mt-1">
                      08:32 ✓✓
                    </p>
                  </div>
                </div>
              </div>

              {/* SMS Preview */}
              {data.smsEnabled && (
                <div className="rounded-lg overflow-hidden border">
                  <div className="bg-muted px-3 py-2 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">SMS</span>
                  </div>
                  <div className="bg-background p-3 min-h-[60px]">
                    <div className="max-w-[85%] bg-muted rounded-lg rounded-tl-none p-2.5">
                      <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                        {renderPreviewMessage(data.smsTemplate)}
                      </p>
                      <p className="text-[10px] text-muted-foreground text-right mt-1">08:32</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

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

  const stepTitles = ["Créditos", "DDD + TAG", "Mensagem WA", "SMS", "WhatsApp", "Confirmar"];

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
