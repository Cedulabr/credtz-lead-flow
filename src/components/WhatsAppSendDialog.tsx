import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Loader2, Paperclip, User } from "lucide-react";
import { useWhatsApp } from "@/hooks/useWhatsApp";

interface WhatsAppSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName?: string;
  clientPhone?: string;
  defaultMessage?: string;
  /** Base64 encoded file to send as media */
  mediaBase64?: string;
  mediaName?: string;
}

export function WhatsAppSendDialog({
  open,
  onOpenChange,
  clientName = "",
  clientPhone = "",
  defaultMessage = "",
  mediaBase64,
  mediaName,
}: WhatsAppSendDialogProps) {
  const { hasToken, sending, sendTextMessage, sendMediaMessage, loadingToken } = useWhatsApp();
  const [message, setMessage] = useState(defaultMessage);
  const [phone, setPhone] = useState(clientPhone);

  useEffect(() => {
    if (open) {
      setMessage(defaultMessage || `Olá ${clientName?.split(" ")[0] || ""}, tudo bem?`);
      setPhone(clientPhone?.replace(/\D/g, "") || "");
    }
  }, [open, defaultMessage, clientName, clientPhone]);

  const handleSend = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) return;

    // Ensure country code
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

    let success: boolean;
    if (mediaBase64 && mediaName) {
      success = await sendMediaMessage(fullPhone, mediaBase64, mediaName, message, clientName);
    } else {
      success = await sendTextMessage(fullPhone, message, clientName);
    }

    if (success) {
      onOpenChange(false);
    }
  };

  const handleFallback = () => {
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${fullPhone}?text=${encoded}`, "_blank");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-green-600" />
          </div>
          <DialogTitle className="text-center">Enviar via WhatsApp</DialogTitle>
          <DialogDescription className="text-center">
            {clientName && (
              <span className="flex items-center justify-center gap-1 mt-1">
                <User className="h-3 w-3" /> {clientName}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Telefone</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5585999999999"
            />
          </div>

          <div>
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Digite sua mensagem..."
            />
          </div>

          {mediaBase64 && mediaName && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{mediaName}</span>
              <Badge variant="secondary" className="ml-auto text-xs">Anexo</Badge>
            </div>
          )}

          {!hasToken && !loadingToken && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
              ⚠️ Token não configurado. A mensagem será enviada via link externo (wa.me).
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          {hasToken ? (
            <Button
              onClick={handleSend}
              disabled={sending || !phone || (!message && !mediaBase64)}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </Button>
          ) : (
            <Button
              onClick={handleFallback}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4" />
              Abrir WhatsApp Web
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
