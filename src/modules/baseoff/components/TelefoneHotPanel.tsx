import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  MessageCircle, 
  Copy, 
  Star, 
  StarOff,
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

  return (
    <Card className="p-4 sticky top-4 border-2 border-primary/20 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
          <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="font-bold text-lg">📞 Telefones HOT</h3>
          <p className="text-xs text-muted-foreground">Contate o cliente</p>
        </div>
      </div>

      <div className="space-y-3">
        {telefones.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Nenhum telefone cadastrado
          </p>
        ) : (
          telefones.map((tel, index) => (
            <div 
              key={index} 
              className={cn(
                "p-3 rounded-xl border-2 bg-background transition-all",
                tel.principal ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              {/* Phone Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {tel.tipo === 'celular' ? '📱 Celular' : '☎️ Fixo'}
                  </Badge>
                  {tel.principal && (
                    <Badge className="bg-primary/20 text-primary text-xs">
                      ⭐ Principal
                    </Badge>
                  )}
                </div>
                {tel.valido !== undefined && (
                  tel.valido ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )
                )}
              </div>

              {/* Phone Number */}
              <p className="text-xl font-bold font-mono mb-3">
                {formatPhone(tel.numero)}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {tel.tipo === 'celular' && (
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 bg-green-600 hover:bg-green-700"
                    onClick={() => handleWhatsApp(tel.numero)}
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleCall(tel.numero)}
                >
                  <Phone className="w-4 h-4" />
                  Ligar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => copyToClipboard(tel.numero)}
                >
                  <Copy className="w-4 h-4" />
                  Copiar
                </Button>
                {onMarcarPrincipal && !tel.principal && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 ml-auto"
                    onClick={() => onMarcarPrincipal(tel.numero)}
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}

        {/* Email Section */}
        {email && (
          <div className="pt-3 border-t">
            <div className="p-3 rounded-xl border bg-background">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Email</span>
              </div>
              <p className="font-medium truncate mb-2">{email}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => window.open(`mailto:${email}`, '_blank')}
                >
                  <Mail className="w-4 h-4" />
                  Enviar Email
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(email);
                    toast.success('Email copiado!');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
