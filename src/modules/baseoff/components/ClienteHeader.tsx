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
  Hash
} from 'lucide-react';
import { BaseOffClient } from '../types';
import { StatusBadge } from './StatusBadge';
import { formatCPFFull, formatDate } from '../utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClienteHeaderProps {
  client: BaseOffClient;
}

export function ClienteHeader({ client }: ClienteHeaderProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  // Calculate age
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

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column - Personal Info */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4" />
            Dados Pessoais
          </h3>
          <div className="grid gap-3">
            <InfoRow 
              icon={Calendar} 
              label="Data Nascimento" 
              value={client.data_nascimento ? `${formatDate(client.data_nascimento)}${age ? ` (${age} anos)` : ''}` : null} 
            />
            <InfoRow icon={User} label="Sexo" value={client.sexo} />
            <InfoRow icon={User} label="Nome da Mãe" value={client.nome_mae} />
            <InfoRow icon={Hash} label="NB" value={client.nb} />
            <InfoRow icon={FileText} label="Espécie" value={client.esp} />
            <InfoRow icon={FileText} label="Situação Benefício" value={client.status_beneficio} />
          </div>
        </div>

        {/* Right Column - Bank & Location */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Building className="w-4 h-4" />
            Dados Bancários e Localização
          </h3>
          <div className="grid gap-3">
            <InfoRow icon={CreditCard} label="Banco Pagamento" value={client.banco_pagto} />
            <InfoRow icon={MapPin} label="Município" value={client.municipio} />
            <InfoRow icon={MapPin} label="UF" value={client.uf} />
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
  if (!value) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-border/50">
        <span className="text-muted-foreground flex items-center gap-2 text-sm">
          <Icon className="w-4 h-4" />
          {label}
        </span>
        <span className="text-muted-foreground/50">---</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50">
      <span className="text-muted-foreground flex items-center gap-2 text-sm">
        <Icon className="w-4 h-4" />
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
