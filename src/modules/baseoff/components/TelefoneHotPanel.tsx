import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  MessageCircle, 
  Copy, 
  Star, 
  CheckCircle,
  XCircle,
  Mail
} from 'lucide-react';
import { formatPhone, getWhatsAppLink } from '../utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TelefoneHotPanelProps {
  telefones: {
    numero: string;
    tipo: 'celular' | 'fixo';
    principal?: boolean;
    valido?: boolean;
  }[];
  email?: string | null;
  onMarcarPrincipal?: (numero: string) => void;
}

export function TelefoneHotPanel({ 
  telefones, 
  email,
  onMarcarPrincipal 
}: TelefoneHotPanelProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Número copiado!');
  };

  const handleWhatsApp = (phone: string) => {
    window.open(getWhatsAppLink(phone), '_blank');
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone.replace(/\D/g, '')}`, '_self');
  };

  if (telefones.length === 0 && !email) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Phone className="w-4 h-4" />
        Contatos
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {telefones.map((tel, index) => (
          <Card 
            key={index} 
            className={cn(
              "p-4 transition-all shadow-sm",
              tel.principal && "ring-2 ring-primary/30"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-xs">
                  {tel.tipo === 'celular' ? '📱 Celular' : '☎️ Fixo'}
                </Badge>
                {tel.principal && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Star className="w-3 h-3" /> Principal
                  </Badge>
                )}
              </div>
              {tel.valido !== undefined && (
                tel.valido 
                  ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                  : <XCircle className="w-4 h-4 text-destructive" />
              )}
            </div>

            {/* Number */}
            <p className="text-xl font-bold font-mono mb-3">
              {formatPhone(tel.numero)}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {tel.tipo === 'celular' && (
                <Button
                  size="lg"
                  className="gap-2 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleWhatsApp(tel.numero)}
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                className="gap-2 flex-1"
                onClick={() => handleCall(tel.numero)}
              >
                <Phone className="w-5 h-5" />
                Ligar
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => copyToClipboard(tel.numero)}
              >
                <Copy className="w-4 h-4" />
              </Button>
              {onMarcarPrincipal && !tel.principal && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => onMarcarPrincipal(tel.numero)}
                >
                  <Star className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>
        ))}

        {/* Email Card */}
        {email && (
          <Card className="p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs gap-1">
                <Mail className="w-3 h-3" /> Email
              </Badge>
            </div>
            <p className="font-medium truncate mb-3 text-lg">{email}</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="lg"
                className="gap-2 flex-1"
                onClick={() => window.open(`mailto:${email}`, '_blank')}
              >
                <Mail className="w-5 h-5" />
                Enviar Email
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(email);
                  toast.success('Email copiado!');
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
