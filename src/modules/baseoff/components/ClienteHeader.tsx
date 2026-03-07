import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  MapPin, 
  Building, 
  Copy, 
  CreditCard,
  FileText,
  Hash,
  Shield,
  Home,
  Landmark,
  Banknote,
  User
} from 'lucide-react';
import { BaseOffClient } from '../types';
import { StatusBadge } from './StatusBadge';
import { formatCPFFull, formatDate, formatCurrency, parseBRDate } from '../utils';
import { toast } from 'sonner';

interface ClienteHeaderProps {
  client: BaseOffClient;
}

export function ClienteHeader({ client }: ClienteHeaderProps) {
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

  const buildAddress = () => {
    const parts = [
      client.logr_tipo_1,
      client.logr_titulo_1,
      client.logr_nome_1,
      client.logr_numero_1 ? `nº ${client.logr_numero_1}` : null,
      client.logr_complemento_1,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
    return client.endereco;
  };

  const contractCount = client.contratos?.length || client.total_contracts || 0;

  return (
    <Card className="p-5 border">
      {/* Top Row: Name, CPF, NB inline */}
      <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-bold">{client.nome}</h2>
          <StatusBadge status={client.status || 'simulado'} />
          {age && (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-sm px-3 py-1">
              {age} anos
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 ml-auto flex-wrap">
          <CopyChip label="CPF" value={formatCPFFull(client.cpf)} rawValue={client.cpf} onCopy={copyToClipboard} />
          <CopyChip label="NB" value={client.nb} rawValue={client.nb} onCopy={copyToClipboard} />
          <Badge variant="outline" className="text-sm px-3 py-1.5">
            {contractCount} contrato{contractCount !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="grid md:grid-cols-3 gap-5">
        {/* Column 1 - Personal & Benefit */}
        <div className="space-y-2">
          <SectionTitle icon={User} title="Dados Pessoais / Benefício" />
          <div className="grid gap-1">
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

        {/* Column 2 - Banking */}
        <div className="space-y-2">
          <SectionTitle icon={Landmark} title="Dados Bancários" />
          <div className="grid gap-1">
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

        {/* Column 3 - Address */}
        <div className="space-y-2">
          <SectionTitle icon={Home} title="Endereço" />
          <div className="grid gap-1">
            <InfoRow label="Endereço" value={buildAddress()} />
            <InfoRow label="Bairro" value={client.bairro || client.bairro_1} />
            <InfoRow label="Município" value={client.municipio || client.cidade_1} />
            <InfoRow label="UF" value={client.uf || client.uf_1} />
            <InfoRow label="CEP" value={client.cep || client.cep_1} />
            {client.bairro_1 && client.bairro && client.bairro_1 !== client.bairro && (
              <>
                <div className="pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground font-semibold">Endereço Alternativo</span>
                </div>
                <InfoRow label="Bairro" value={client.bairro_1} />
                <InfoRow label="Cidade" value={client.cidade_1} />
                <InfoRow label="UF" value={client.uf_1} />
                <InfoRow label="CEP" value={client.cep_1} />
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
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
    <div className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2.5 py-1">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="font-mono text-sm font-medium">{value}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
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
      <span className={`text-sm text-right max-w-[60%] truncate ${isEmpty ? 'text-muted-foreground/40' : 'font-medium'}`}>
        {isEmpty ? '---' : value}
      </span>
    </div>
  );
}
