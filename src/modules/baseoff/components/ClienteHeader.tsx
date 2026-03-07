import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, 
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
  Banknote
} from 'lucide-react';
import { BaseOffClient } from '../types';
import { StatusBadge } from './StatusBadge';
import { formatCPFFull, formatDate, formatCurrency } from '../utils';
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
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(client.data_nascimento);

  // Build full address string
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

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{client.nome}</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-muted-foreground font-mono text-lg">
                {formatCPFFull(client.cpf)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => copyToClipboard(client.cpf, 'CPF')}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <StatusBadge status={client.status || 'simulado'} />
            </div>
          </div>
        </div>
        <Badge variant="outline" className="text-base px-4 py-2 bg-background">
          {client.total_contracts || 0} contratos
        </Badge>
      </div>

      {/* Three Column Layout */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Column 1 - Personal & Benefit Info */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4" />
            Dados Pessoais / Benefício
          </h3>
          <div className="grid gap-2">
            <InfoRow icon={Calendar} label="Nascimento" value={client.data_nascimento ? `${formatDate(client.data_nascimento)}${age ? ` (${age} anos)` : ''}` : null} />
            <InfoRow icon={User} label="Sexo" value={client.sexo} />
            <InfoRow icon={User} label="Nome da Mãe" value={client.nome_mae} />
            <InfoRow icon={Hash} label="NB" value={client.nb} />
            <InfoRow icon={FileText} label="Espécie" value={client.esp} />
            <InfoRow icon={Calendar} label="DIB" value={formatDate(client.dib)} />
            <InfoRow icon={Calendar} label="DDB" value={formatDate(client.ddb)} />
            <InfoRow icon={FileText} label="Situação" value={client.status_beneficio} />
            <InfoRow icon={Shield} label="Bloqueio" value={client.bloqueio} />
            <InfoRow icon={FileText} label="Pensão" value={client.pensao_alimenticia} />
            <InfoRow icon={User} label="Representante" value={client.representante} />
          </div>
        </div>

        {/* Column 2 - Banking Info */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Landmark className="w-4 h-4" />
            Dados Bancários
          </h3>
          <div className="grid gap-2">
            <InfoRow icon={Building} label="Banco Pagto" value={client.banco_pagto} />
            <InfoRow icon={Hash} label="Agência" value={client.agencia_pagto} />
            <InfoRow icon={Hash} label="Conta Corrente" value={client.conta_corrente} />
            <InfoRow icon={FileText} label="Meio Pagto" value={client.meio_pagto} />
            <InfoRow icon={Building} label="Órgão Pagador" value={client.orgao_pagador} />
            <InfoRow icon={Banknote} label="MR" value={client.mr ? formatCurrency(client.mr) : null} />
            <InfoRow icon={CreditCard} label="Banco RMC" value={client.banco_rmc} />
            <InfoRow icon={Banknote} label="Valor RMC" value={client.valor_rmc ? formatCurrency(client.valor_rmc) : null} />
            <InfoRow icon={CreditCard} label="Banco RCC" value={client.banco_rcc} />
            <InfoRow icon={Banknote} label="Valor RCC" value={client.valor_rcc ? formatCurrency(client.valor_rcc) : null} />
          </div>
        </div>

        {/* Column 3 - Address Info */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Home className="w-4 h-4" />
            Endereço
          </h3>
          <div className="grid gap-2">
            <InfoRow icon={MapPin} label="Endereço" value={buildAddress()} />
            <InfoRow icon={MapPin} label="Bairro" value={client.bairro || client.bairro_1} />
            <InfoRow icon={MapPin} label="Município" value={client.municipio || client.cidade_1} />
            <InfoRow icon={MapPin} label="UF" value={client.uf || client.uf_1} />
            <InfoRow icon={MapPin} label="CEP" value={client.cep || client.cep_1} />
            {client.bairro_1 && client.bairro && client.bairro_1 !== client.bairro && (
              <>
                <div className="pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground font-semibold">Endereço Alternativo</span>
                </div>
                <InfoRow icon={MapPin} label="Bairro" value={client.bairro_1} />
                <InfoRow icon={MapPin} label="Cidade" value={client.cidade_1} />
                <InfoRow icon={MapPin} label="UF" value={client.uf_1} />
                <InfoRow icon={MapPin} label="CEP" value={client.cep_1} />
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function InfoRow({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType;
  label: string; 
  value: string | number | null | undefined;
}) {
  if (!value || value === '---') {
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-border/30">
        <span className="text-muted-foreground flex items-center gap-2 text-xs">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </span>
        <span className="text-muted-foreground/50 text-xs">---</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/30">
      <span className="text-muted-foreground flex items-center gap-2 text-xs">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
      <span className="font-medium text-sm text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
