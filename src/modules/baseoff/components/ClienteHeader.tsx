import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Copy, 
  User, 
  ChevronDown, 
  ChevronUp,
  Building2,
  MapPin,
  Shield,
  Landmark,
  Home
} from 'lucide-react';
import { BaseOffClient } from '../types';
import { StatusBadge } from './StatusBadge';
import { formatCPFFull, formatDate, formatCurrency, parseBRDate } from '../utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClienteHeaderProps {
  client: BaseOffClient;
}

export function ClienteHeader({ client }: ClienteHeaderProps) {
  const [showDetails, setShowDetails] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const calculateAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null;
    const birth = parseBRDate(birthDate);
    if (!birth) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(client.data_nascimento);

  return (
    <Card className="overflow-hidden border shadow-sm">
      {/* Profile Section */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <User className="w-7 h-7 text-primary" />
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-xl font-bold truncate">{client.nome}</h2>
              <StatusBadge status={client.status || 'simulado'} />
              {age && (
                <Badge variant="secondary" className="text-sm font-semibold">
                  {age} anos
                </Badge>
              )}
            </div>

            {/* Chips: CPF, NB */}
            <div className="flex items-center gap-3 flex-wrap mt-2">
              <CopyChip label="CPF" value={formatCPFFull(client.cpf)} rawValue={client.cpf} onCopy={copyToClipboard} />
              <CopyChip label="NB" value={client.nb || 'N/I'} rawValue={client.nb || ''} onCopy={copyToClipboard} />
            </div>

            {/* Info Badges */}
            <div className="flex items-center gap-2 flex-wrap mt-3">
              {client.banco_pagto && (
                <Badge variant="outline" className="gap-1.5 text-xs font-normal">
                  <Landmark className="w-3 h-3" />
                  {client.banco_pagto}
                </Badge>
              )}
              {client.esp && (
                <Badge variant="outline" className="gap-1.5 text-xs font-normal">
                  <Shield className="w-3 h-3" />
                  Esp. {client.esp}
                </Badge>
              )}
              {(client.municipio || client.cidade_1) && (
                <Badge variant="outline" className="gap-1.5 text-xs font-normal">
                  <MapPin className="w-3 h-3" />
                  {client.municipio || client.cidade_1}{client.uf || client.uf_1 ? ` - ${client.uf || client.uf_1}` : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <CollapsibleTrigger asChild>
          <button className="w-full px-5 py-2.5 border-t bg-muted/30 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showDetails ? 'Ocultar detalhes' : 'Ver todos os dados'}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-5 pt-3 border-t">
            <div className="grid md:grid-cols-3 gap-5">
              {/* Personal & Benefit */}
              <div className="space-y-2">
                <SectionTitle icon={User} title="Dados Pessoais / Benefício" />
                <div className="grid gap-0.5">
                  <InfoRow label="Nascimento" value={client.data_nascimento ? `${formatDate(client.data_nascimento)}${age ? ` (${age} anos)` : ''}` : null} />
                  <InfoRow label="Sexo" value={client.sexo} />
                  <InfoRow label="Nome da Mãe" value={client.nome_mae} />
                  <InfoRow label="Espécie" value={client.esp} />
                  <InfoRow label="DIB" value={formatDate(client.dib)} />
                  <InfoRow label="DDB" value={formatDate(client.ddb)} />
                  <InfoRow label="Situação" value={client.status_beneficio} />
                  <InfoRow label="Bloqueio" value={client.bloqueio} />
                  <InfoRow label="Pensão" value={client.pensao_alimenticia} />
                  <InfoRow label="Representante" value={client.representante} />
                </div>
              </div>

              {/* Banking */}
              <div className="space-y-2">
                <SectionTitle icon={Landmark} title="Dados Bancários" />
                <div className="grid gap-0.5">
                  <InfoRow label="Banco Pagto" value={client.banco_pagto} />
                  <InfoRow label="Agência" value={client.agencia_pagto} />
                  <InfoRow label="Conta Corrente" value={client.conta_corrente} />
                  <InfoRow label="Meio Pagto" value={client.meio_pagto} />
                  <InfoRow label="Órgão Pagador" value={client.orgao_pagador} />
                  <InfoRow label="MR" value={client.mr ? formatCurrency(client.mr) : null} />
                  <InfoRow label="Banco RMC" value={client.banco_rmc} />
                  <InfoRow label="Valor RMC" value={client.valor_rmc ? formatCurrency(client.valor_rmc) : null} />
                  <InfoRow label="Banco RCC" value={client.banco_rcc} />
                  <InfoRow label="Valor RCC" value={client.valor_rcc ? formatCurrency(client.valor_rcc) : null} />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <SectionTitle icon={Home} title="Endereço" />
                <div className="grid gap-0.5">
                  <InfoRow label="Endereço" value={buildAddress(client)} />
                  <InfoRow label="Bairro" value={client.bairro || client.bairro_1} />
                  <InfoRow label="Município" value={client.municipio || client.cidade_1} />
                  <InfoRow label="UF" value={client.uf || client.uf_1} />
                  <InfoRow label="CEP" value={client.cep || client.cep_1} />
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function buildAddress(client: BaseOffClient) {
  const parts = [
    client.logr_tipo_1,
    client.logr_titulo_1,
    client.logr_nome_1,
    client.logr_numero_1 ? `nº ${client.logr_numero_1}` : null,
    client.logr_complemento_1,
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return client.endereco;
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-border/40">
      <Icon className="w-4 h-4" />
      {title}
    </h3>
  );
}

function CopyChip({ label, value, rawValue, onCopy }: { label: string; value: string; rawValue: string; onCopy: (text: string, label: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-3 py-1.5">
      <span className="text-xs text-muted-foreground font-medium">{label}:</span>
      <span className="font-mono text-sm font-semibold">{value}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 hover:bg-background"
        onClick={() => onCopy(rawValue, label)}
      >
        <Copy className="w-3 h-3" />
      </Button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  const isEmpty = !value || value === '---';
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/20">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className={cn("text-sm text-right max-w-[60%] truncate", isEmpty ? 'text-muted-foreground/40' : 'font-medium')}>
        {isEmpty ? '---' : value}
      </span>
    </div>
  );
}
