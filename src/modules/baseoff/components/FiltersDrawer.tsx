import React, { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, X, CalendarDays, User, Phone, MapPin, Building } from 'lucide-react';
import { BaseOffFilters, DEFAULT_FILTERS, STATUS_CONFIG, ClientStatus } from '../types';
import { generateMonthOptions } from '../utils';
import { cn } from '@/lib/utils';

interface FiltersDrawerProps {
  filters: BaseOffFilters;
  onFiltersChange: (filters: BaseOffFilters) => void;
  availableUFs?: string[];
  availableBancos?: string[];
}

const periodOptions = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: '7days', label: '7 dias' },
  { value: '30days', label: '30 dias' },
  { value: '90days', label: '90 dias' },
  { value: 'all', label: 'Todos' },
];

export function FiltersDrawer({ filters, onFiltersChange, availableUFs = [], availableBancos = [] }: FiltersDrawerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.period !== 'all') count++;
    if (filters.month !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.cliente) count++;
    if (filters.telefone) count++;
    if (filters.uf !== 'all') count++;
    if (filters.banco !== 'all') count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="lg" className="gap-2 h-12 px-4 text-base rounded-xl">
          <Filter className="w-5 h-5" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">Filtros</SheetTitle>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive">
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </SheetHeader>
        
        <div className="space-y-6">
          {/* Quick Period */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base">
              <CalendarDays className="w-4 h-4" />
              Período Rápido
            </Label>
            <div className="flex flex-wrap gap-2">
              {periodOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={filters.period === option.value && filters.month === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onFiltersChange({ ...filters, period: option.value, month: 'all' })}
                  className="h-10 text-sm"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Month Filter */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base">
              <CalendarDays className="w-4 h-4" />
              Mês Específico
            </Label>
            <Select
              value={filters.month}
              onValueChange={(value) => {
                onFiltersChange({ 
                  ...filters, 
                  month: value, 
                  period: value !== 'all' ? 'all' : filters.period 
                });
              }}
            >
              <SelectTrigger className="h-12 text-base rounded-xl">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-base">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
            >
              <SelectTrigger className="h-12 text-base rounded-xl">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.emoji} {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Client Search */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base">
              <User className="w-4 h-4" />
              Cliente (Nome ou CPF)
            </Label>
            <Input
              value={filters.cliente}
              onChange={(e) => onFiltersChange({ ...filters, cliente: e.target.value })}
              placeholder="Buscar por nome ou CPF..."
              className="h-12 text-base rounded-xl"
            />
          </div>
          
          {/* Phone Search */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base">
              <Phone className="w-4 h-4" />
              Telefone
            </Label>
            <Input
              value={filters.telefone}
              onChange={(e) => onFiltersChange({ ...filters, telefone: e.target.value })}
              placeholder="Buscar por telefone..."
              className="h-12 text-base rounded-xl"
            />
          </div>
          
          {/* UF Filter */}
          {availableUFs.length > 0 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
                <MapPin className="w-4 h-4" />
                Estado (UF)
              </Label>
              <Select
                value={filters.uf}
                onValueChange={(value) => onFiltersChange({ ...filters, uf: value })}
              >
                <SelectTrigger className="h-12 text-base rounded-xl">
                  <SelectValue placeholder="Todos os estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  {availableUFs.map((uf) => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Bank Filter */}
          {availableBancos.length > 0 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
                <Building className="w-4 h-4" />
                Banco
              </Label>
              <Select
                value={filters.banco}
                onValueChange={(value) => onFiltersChange({ ...filters, banco: value })}
              >
                <SelectTrigger className="h-12 text-base rounded-xl">
                  <SelectValue placeholder="Todos os bancos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os bancos</SelectItem>
                  {availableBancos.map((banco) => (
                    <SelectItem key={banco} value={banco}>Banco {banco}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        <div className="mt-8 pt-4 border-t">
          <Button 
            className="w-full h-12 text-base rounded-xl" 
            onClick={() => setIsOpen(false)}
          >
            Aplicar Filtros
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
