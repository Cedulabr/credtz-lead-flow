import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Loader2, Send } from "lucide-react";
import { useWhatsApp } from "@/hooks/useWhatsApp";

interface WhatsAppNotifyDialogProps {
  open: boolean;
  onComplete: () => void;
  clientName: string;
  clientPhone: string;
}

export function WhatsAppNotifyDialog({ open, onComplete, clientName, clientPhone }: WhatsAppNotifyDialogProps) {
  const { hasToken, sending, sendTextMessage } = useWhatsApp();
  const [message, setMessage] = useState(
    `Olá ${clientName?.split(" ")[0] || ""}, tudo bem? Sua proposta foi registrada com sucesso. Em breve entraremos em contato!`
  );

  const handleSend = async () => {
    const cleanPhone = clientPhone.replace(/\D/g, "");
    if (!cleanPhone) { onComplete(); return; }
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    
    const success = await sendTextMessage(fullPhone, message, clientName);
    onComplete();
  };

  const handleFallback = () => {
    const cleanPhone = clientPhone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${fullPhone}?text=${encoded}`, "_blank");
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={() => onComplete()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-green-600" />
          </div>
          <DialogTitle className="text-center">Enviar mensagem via WhatsApp?</DialogTitle>
          <DialogDescription className="text-center">
            O cliente receberá uma mensagem WhatsApp sobre a proposta.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Mensagem..."
          />
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onComplete} disabled={sending} className="flex-1">
            Não, obrigado
          </Button>
          {hasToken ? (
            <Button
              onClick={handleSend}
              disabled={sending}
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar via API
            </Button>
          ) : (
            <Button
              onClick={handleFallback}
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4" />
              Abrir WhatsApp
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
