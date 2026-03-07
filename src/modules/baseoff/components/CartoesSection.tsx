import React from 'react';
import { Card } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { BaseOffContract } from '../types';
import { formatCurrency, formatDate } from '../utils';

interface CartoesSectionProps {
  contracts: BaseOffContract[];
}

// Card contract types (RMC/RCC) - by code or keyword
const CARD_TYPE_CODES = ['4', '5', '6', '7', '12', '13'];
const CARD_KEYWORDS = ['cartao', 'cartão', 'rmc', 'rcc', 'card', 'beneficio', 'benefício'];

export function isCardContract(tipoEmprestimo: string | null): boolean {
  if (!tipoEmprestimo) return false;
  const trimmed = tipoEmprestimo.trim();
  if (CARD_TYPE_CODES.includes(trimmed)) return true;
  const lower = trimmed.toLowerCase();
  return CARD_KEYWORDS.some(kw => lower.includes(kw));
}

export function CartoesSection({ contracts }: CartoesSectionProps) {
  const cardContracts = contracts.filter(c => isCardContract(c.tipo_emprestimo));
  
  if (cardContracts.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        💳 Cartões
      </h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {cardContracts.map((contract) => (
          <Card key={contract.id} className="p-4 border-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="font-bold">Banco {contract.banco_emprestimo || 'N/I'}</p>
                <p className="text-xs text-muted-foreground">
                  Tipo {contract.tipo_emprestimo} • {contract.contrato}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Averbação</p>
                <p className="font-medium text-sm">{formatDate(contract.data_averbacao)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Parcela</p>
                <p className="font-medium text-sm">{formatCurrency(contract.vl_parcela)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vl. Liberado</p>
                <p className="font-medium text-sm">{formatCurrency(contract.vl_emprestimo)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
