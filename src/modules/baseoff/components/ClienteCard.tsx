import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, User, Calendar, ChevronRight, FileText, MapPin } from 'lucide-react';
import { BaseOffClient, ClientStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { formatCPF, formatPhone, formatDate, getWhatsAppLink } from '../utils';
import { cn } from '@/lib/utils';

interface ClienteCardProps {
  client: BaseOffClient;
  onClick: () => void;
}

export function ClienteCard({ client, onClick }: ClienteCardProps) {
  const status: ClientStatus = client.status || 'simulado';
  const phone = client.tel_cel_1 || client.tel_fixo_1;
  
  return (
    <Card 
      className={cn(
        "p-4 cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:scale-[1.01] hover:border-primary/30",
        "active:scale-[0.99]"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Client Info */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base truncate">{client.nome}</h3>
              <p className="text-sm text-muted-foreground">{formatCPF(client.cpf)}</p>
            </div>
          </div>
          
          {/* Details */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="w-3.5 h-3.5" />
              <span className="truncate">{formatPhone(phone)}</span>
            </div>
            {client.uf && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>{client.municipio ? `${client.municipio}/${client.uf}` : client.uf}</span>
              </div>
            )}
            {client.banco_pagto && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FileText className="w-3.5 h-3.5" />
                <span className="truncate">Banco {client.banco_pagto}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(client.updated_at)}</span>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <StatusBadge status={status} size="sm" />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="w-3.5 h-3.5" />
              <span>{client.total_contracts || 0} contratos</span>
            </div>
          </div>
        </div>
        
        {/* Right: Actions */}
        <div className="flex flex-col items-center gap-2">
          {phone && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-green-600 hover:bg-green-50"
              onClick={(e) => {
                e.stopPropagation();
                window.open(getWhatsAppLink(phone), '_blank');
              }}
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          )}
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}
