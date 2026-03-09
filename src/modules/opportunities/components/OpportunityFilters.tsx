import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { OpportunityFilter, DEFAULT_FILTERS } from '../types';

interface OpportunityFiltersProps {
  filters: OpportunityFilter;
  onFiltersChange: (filters: OpportunityFilter) => void;
  banks: string[];
  resultCount: number;
}

export function OpportunityFilters({ filters, onFiltersChange, banks, resultCount }: OpportunityFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = [
    filters.type !== 'all',
    filters.bank !== 'all',
    filters.status !== 'all',
    filters.priority !== 'all',
    filters.source !== 'all',
  ].filter(Boolean).length;

  const handleClearFilters = () => onFiltersChange(DEFAULT_FILTERS);

  const FilterContent = () => (
    <div className="space-y-4">
      {/* Source */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Fonte</label>
        <Select value={filters.source} onValueChange={(v) => onFiltersChange({ ...filters, source: v as any })}>
          <SelectTrigger><SelectValue placeholder="Todas as fontes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fontes</SelectItem>
            <SelectItem value="televendas">Televendas (Refinanciamento)</SelectItem>
            <SelectItem value="propostas">Meus Clientes (Propostas)</SelectItem>
            <SelectItem value="leads">Leads Premium</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Tipo de Operação</label>
        <Select value={filters.type} onValueChange={(v) => onFiltersChange({ ...filters, type: v as any })}>
          <SelectTrigger><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="portability">Portabilidade</SelectItem>
            <SelectItem value="refinancing">Refinanciamento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bank */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Banco</label>
        <Select value={filters.bank} onValueChange={(v) => onFiltersChange({ ...filters, bank: v })}>
          <SelectTrigger><SelectValue placeholder="Todos os bancos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os bancos</SelectItem>
            {banks.map((bank) => (
              <SelectItem key={bank} value={bank.toLowerCase()}>{bank}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
        <Select value={filters.status} onValueChange={(v) => onFiltersChange({ ...filters, status: v as any })}>
          <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="eligible">Elegíveis / Hoje</SelectItem>
            <SelectItem value="soon">Em breve (5 dias)</SelectItem>
            <SelectItem value="monitoring">Monitorando</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Prioridade</label>
        <Select value={filters.priority} onValueChange={(v) => onFiltersChange({ ...filters, priority: v as any })}>
          <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {activeFiltersCount > 0 && (
        <Button variant="ghost" className="w-full" onClick={handleClearFilters}>
          <X className="h-4 w-4 mr-2" />Limpar filtros
        </Button>
      )}
    </div>
  );

  const sourceLabel: Record<string, string> = {
    televendas: 'Televendas',
    propostas: 'Propostas',
    leads: 'Leads',
  };

  return (
    <div className="space-y-3">
      {/* Mobile */}
      <div className="flex gap-2 md:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou telefone..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10"
          />
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
            <div className="py-4"><FilterContent /></div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={() => setIsOpen(false)}>Aplicar ({resultCount})</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop */}
      <div className="hidden md:flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou telefone..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10"
          />
        </div>

        <Select value={filters.source} onValueChange={(v) => onFiltersChange({ ...filters, source: v as any })}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Fonte" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fontes</SelectItem>
            <SelectItem value="televendas">Televendas</SelectItem>
            <SelectItem value="propostas">Meus Clientes</SelectItem>
            <SelectItem value="leads">Leads Premium</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => onFiltersChange({ ...filters, status: v as any })}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="eligible">Elegíveis</SelectItem>
            <SelectItem value="soon">Em breve</SelectItem>
            <SelectItem value="monitoring">Monitorando</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.bank} onValueChange={(v) => onFiltersChange({ ...filters, bank: v })}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Banco" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {banks.map((bank) => (
              <SelectItem key={bank} value={bank.toLowerCase()}>{bank}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-1" />Limpar
          </Button>
        )}

        <Badge variant="secondary" className="ml-auto">{resultCount} resultados</Badge>
      </div>

      {/* Active filter pills (mobile) */}
      {activeFiltersCount > 0 && (
        <div className="flex gap-2 flex-wrap md:hidden">
          {filters.source !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {sourceLabel[filters.source]}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onFiltersChange({ ...filters, source: 'all' })} />
            </Badge>
          )}
          {filters.type !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {filters.type === 'portability' ? 'Portabilidade' : 'Refinanciamento'}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onFiltersChange({ ...filters, type: 'all' })} />
            </Badge>
          )}
          {filters.bank !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {filters.bank}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onFiltersChange({ ...filters, bank: 'all' })} />
            </Badge>
          )}
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {filters.status === 'eligible' ? 'Elegíveis' : filters.status === 'soon' ? 'Em breve' : 'Monitorando'}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onFiltersChange({ ...filters, status: 'all' })} />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
