import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { MessageCircle, Send, Loader2, Paperclip, User, CalendarIcon, Clock, Mic } from "lucide-react";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useAudioFiles } from "@/modules/audios/hooks/useAudioFiles";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface WhatsAppSentInfo {
  instanceName: string;
  instancePhone: string | null;
  sentVia: 'api' | 'link';
  message: string;
  audioTitle?: string;
  clientPhone: string;
}

interface WhatsAppSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName?: string;
  clientPhone?: string;
  defaultMessage?: string;
  mediaBase64?: string;
  mediaName?: string;
  sourceModule?: string;
  sourceRecordId?: string;
  onSent?: (info: WhatsAppSentInfo) => void;
}

export function WhatsAppSendDialog({
  open,
  onOpenChange,
  clientName = "",
  clientPhone = "",
  defaultMessage = "",
  mediaBase64,
  mediaName,
  sourceModule,
  sourceRecordId,
  onSent,
}: WhatsAppSendDialogProps) {
  const { instances, hasInstances, sending, sendTextMessage, sendMediaMessage, scheduleMessage, loadingInstances } = useWhatsApp();
  const { audios, getPublicUrl, downloadAsBase64 } = useAudioFiles();
  const [message, setMessage] = useState(defaultMessage);
  const [phone, setPhone] = useState(clientPhone);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [sendAudio, setSendAudio] = useState(false);
  const [selectedAudioId, setSelectedAudioId] = useState<string>("");
  const [sendingAudio, setSendingAudio] = useState(false);

  useEffect(() => {
    if (open) {
      setMessage(defaultMessage || `Olá ${clientName?.split(" ")[0] || ""}, tudo bem?`);
      setPhone(clientPhone?.replace(/\D/g, "") || "");
      setIsScheduled(false);
      setScheduleDate(undefined);
      setScheduleTime("09:00");
      setSendAudio(false);
      setSelectedAudioId("");
      if (instances.length > 0 && !selectedInstanceId) {
        const firstWithToken = instances.find(i => i.hasToken);
        if (firstWithToken) setSelectedInstanceId(firstWithToken.id);
      }
    }
  }, [open, defaultMessage, clientName, clientPhone, instances, selectedInstanceId]);

  const selectedInstance = instances.find(i => i.id === selectedInstanceId);
  const selectedAudio = audios.find(a => a.id === selectedAudioId);

  const handleSend = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) return;
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

    if (isScheduled && scheduleDate) {
      const [hours, minutes] = scheduleTime.split(":").map(Number);
      const scheduledAt = new Date(scheduleDate);
      scheduledAt.setHours(hours, minutes, 0, 0);

      const success = await scheduleMessage(
        selectedInstanceId, fullPhone, message, scheduledAt, clientName, sourceModule, sourceRecordId,
      );
      if (success) {
        onSent?.({ instanceName: selectedInstance?.instance_name || '', instancePhone: selectedInstance?.phone_number || null, sentVia: 'api', message, clientPhone: fullPhone });
        onOpenChange(false);
      }
      return;
    }

    // If sending audio, download and send as media
    if (sendAudio && selectedAudio) {
      setSendingAudio(true);
      const audioData = await downloadAsBase64(selectedAudio.file_path);
      setSendingAudio(false);
      if (!audioData) {
        toast.error("Erro ao baixar áudio. Verifique se o arquivo existe no storage.");
        return;
      }
      console.log(`[WhatsApp] Audio base64 length: ${audioData.base64.length}, mime: ${audioData.mimeType}`);

      const ext = selectedAudio.file_path.split('.').pop() || 'mp3';
      const audioFileName = `${selectedAudio.title}.${ext}`;

      // Send text first if present, then audio
      if (message.trim()) {
        await sendTextMessage(fullPhone, message, clientName, selectedInstanceId);
      }
      const success = await sendMediaMessage(fullPhone, audioData.base64, audioFileName, '', clientName, selectedInstanceId);
      if (success) {
        onSent?.({ instanceName: selectedInstance?.instance_name || '', instancePhone: selectedInstance?.phone_number || null, sentVia: 'api', message, audioTitle: selectedAudio?.title, clientPhone: fullPhone });
        onOpenChange(false);
      }
      return;
    }

    let success: boolean;
    if (mediaBase64 && mediaName) {
      success = await sendMediaMessage(fullPhone, mediaBase64, mediaName, message, clientName, selectedInstanceId);
    } else {
      success = await sendTextMessage(fullPhone, message, clientName, selectedInstanceId);
    }
    if (success) {
      onSent?.({ instanceName: selectedInstance?.instance_name || '', instancePhone: selectedInstance?.phone_number || null, sentVia: 'api', message, clientPhone: fullPhone });
      onOpenChange(false);
    }
  };

  const handleFallback = () => {
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${fullPhone}?text=${encoded}`, "_blank");
    onSent?.({ instanceName: '', instancePhone: null, sentVia: 'link', message, clientPhone: fullPhone });
    onOpenChange(false);
  };

  const isSending = sending || sendingAudio;
  const canSend = phone && (message || mediaBase64 || (sendAudio && selectedAudioId)) && !(isScheduled && !scheduleDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-green-600" />
          </div>
          <DialogTitle className="text-center">API WhatsApp</DialogTitle>
          <DialogDescription className="text-center">
            {clientName && (
              <span className="flex items-center justify-center gap-1 mt-1">
                <User className="h-3 w-3" /> {clientName}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instance selector */}
          {instances.length > 1 && (
            <div>
              <Label>Instância</Label>
              <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a instância" />
                </SelectTrigger>
                <SelectContent>
                  {instances.filter(i => i.hasToken).map(inst => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.instance_name}
                      {inst.phone_number && ` (${inst.phone_number})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Telefone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5585999999999" />
          </div>

          <div>
            <Label>Mensagem</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Digite sua mensagem..." />
          </div>

          {mediaBase64 && mediaName && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{mediaName}</span>
              <Badge variant="secondary" className="ml-auto text-xs">Anexo</Badge>
            </div>
          )}

          {/* Audio toggle */}
          {hasInstances && audios.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-muted-foreground" />
                  <Label className="cursor-pointer">Enviar áudio?</Label>
                </div>
                <Switch checked={sendAudio} onCheckedChange={setSendAudio} />
              </div>

              {sendAudio && (
                <div className="space-y-2">
                  <Select value={selectedAudioId} onValueChange={setSelectedAudioId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o áudio" />
                    </SelectTrigger>
                    <SelectContent>
                      {audios.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAudio && (
                    <audio controls className="w-full" preload="none">
                      <source src={getPublicUrl(selectedAudio.file_path)} type={selectedAudio.mime_type || 'audio/mpeg'} />
                    </audio>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Schedule toggle */}
          {hasInstances && (
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label className="cursor-pointer">Agendar envio</Label>
              </div>
              <Switch checked={isScheduled} onCheckedChange={setIsScheduled} />
            </div>
          )}

          {isScheduled && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !scheduleDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduleDate ? format(scheduleDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduleDate}
                      onSelect={setScheduleDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="w-28">
                <Label>Hora</Label>
                <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
              </div>
            </div>
          )}

          {!hasInstances && !loadingInstances && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
              ⚠️ Nenhuma instância configurada. A mensagem será enviada via link externo (wa.me).
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancelar
          </Button>
          {hasInstances ? (
            <Button
              onClick={handleSend}
              disabled={isSending || !canSend}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : isScheduled ? <CalendarIcon className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {isScheduled ? "Agendar" : "Enviar"}
            </Button>
          ) : (
            <Button onClick={handleFallback} className="gap-2 bg-green-600 hover:bg-green-700">
              <MessageCircle className="h-4 w-4" />
              Abrir WhatsApp Web
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
