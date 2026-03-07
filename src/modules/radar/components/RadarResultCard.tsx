import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, MapPin, CreditCard, Banknote, Building2, Eye, MessageCircle, Send, MessageSquare, FileText, Phone, Copy } from 'lucide-react';
import { RadarClient } from '../types';
import { WhatsAppSendDialog } from '@/components/WhatsAppSendDialog';
import { toast } from 'sonner';

interface Props {
  client: RadarClient;
  onViewClient?: (cpf: string) => void;
  onViewContracts?: (cpf: string, nome: string) => void;
  onSendSms?: (phone: string, nome: string) => void;
}

const scoreBadge: Record<string, { className: string }> = {
  Premium: { className: 'bg-amber-500 hover:bg-amber-600 text-white' },
  Alta: { className: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  'Média': { className: 'bg-blue-500/20 text-blue-700 dark:text-blue-300' },
  Baixa: { className: '' },
};

function formatCpf(cpf: string) {
  const c = cpf.padStart(11, '0');
  return `${c.slice(0,3)}.${c.slice(3,6)}.${c.slice(6,9)}-${c.slice(9)}`;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function RadarResultCard({ client, onViewClient, onViewContracts, onSendSms }: Props) {
  const badge = scoreBadge[client.classification] || scoreBadge.Baixa;
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [apiWhatsAppOpen, setApiWhatsAppOpen] = useState(false);

  const mainPhone = client.telefones?.[0] || '';
  const normalizedPhone = normalizePhone(mainPhone);

  const handleCopyCpf = () => {
    navigator.clipboard.writeText(client.cpf);
    toast.success('CPF copiado!');
  };

  const handleWhatsAppDirect = () => {
    if (!normalizedPhone) {
      toast.error('Telefone não disponível');
      return;
    }
    const phone55 = normalizedPhone.startsWith('55') ? normalizedPhone : `55${normalizedPhone}`;
    window.open(`https://wa.me/${phone55}`, '_blank');
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              {/* Nome + Idade */}
              <div className="flex items-center gap-2 flex-wrap">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-semibold text-foreground truncate">{client.nome || 'N/A'}</span>
                {client.idade && (
                  <span className="text-sm text-muted-foreground">{client.idade} anos</span>
                )}
              </div>

              {/* CPF + Telefone */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <button
                  onClick={handleCopyCpf}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  title="Copiar CPF"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span className="font-mono">{formatCpf(client.cpf)}</span>
                </button>
                {mainPhone && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {mainPhone}
                  </span>
                )}
              </div>

              {/* Info row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {client.uf && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {client.municipio ? `${client.municipio}/${client.uf}` : client.uf}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" />
                  {client.total_contratos} contratos
                </span>
                <span className="flex items-center gap-1">
                  <Banknote className="h-3.5 w-3.5" />
                  Maior parcela: R$ {client.max_parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                {client.banco_principal && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {client.banco_principal}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge className={badge.className}>
                ⭐ {client.classification}
              </Badge>
              <span className="text-xs text-muted-foreground">Score: {client.opportunity_score}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              onClick={handleWhatsAppDirect}
              disabled={!normalizedPhone}
            >
              <MessageCircle className="h-3.5 w-3.5 text-green-600" />
              WhatsApp
            </Button>

            <Button
              size="sm"
              className="gap-1 text-xs bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setApiWhatsAppOpen(true)}
              disabled={!normalizedPhone}
            >
              <Send className="h-3.5 w-3.5" />
              API WhatsApp
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              onClick={() => onSendSms?.(normalizedPhone, client.nome)}
              disabled={!normalizedPhone}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              SMS
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              onClick={() => onViewContracts?.(client.cpf, client.nome)}
            >
              <FileText className="h-3.5 w-3.5" />
              Ver Contratos
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-xs"
              onClick={() => onViewClient?.(client.cpf)}
            >
              <Eye className="h-3.5 w-3.5" />
              Ver cliente
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API WhatsApp Dialog */}
      <WhatsAppSendDialog
        open={apiWhatsAppOpen}
        onOpenChange={setApiWhatsAppOpen}
        clientName={client.nome}
        clientPhone={normalizedPhone}
        sourceModule="radar"
      />
    </>
  );
}
