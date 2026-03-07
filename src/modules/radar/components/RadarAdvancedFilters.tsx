import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Filter, Search, X } from 'lucide-react';
import { RadarFilters, ESP_FILTER_OPTIONS, PARCELAS_PAGAS_OPTIONS, VALOR_PARCELA_OPTIONS, DDB_OPTIONS } from '../types';

interface Props {
  filters: RadarFilters;
  onApply: (filters: RadarFilters) => void;
  onClear: () => void;
}

export function RadarAdvancedFilters({ filters, onApply, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<RadarFilters>(filters);

  const update = (key: keyof RadarFilters, value: any) => {
    setLocal(prev => ({ ...prev, [key]: value || undefined }));
  };

  const handleApply = () => {
    // Remove smart_filter when using advanced filters
    const { smart_filter, ...rest } = local;
    onApply(rest);
  };

  const handleClear = () => {
    setLocal({});
    onClear();
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros Avançados
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros Avançados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Estado (UF)</label>
                <Input
                  placeholder="Ex: SP"
                  value={local.uf || ''}
                  onChange={e => update('uf', e.target.value.toUpperCase())}
                  maxLength={2}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Cidade</label>
                <Input
                  placeholder="Ex: São Paulo"
                  value={local.cidade || ''}
                  onChange={e => update('cidade', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Banco do Contrato</label>
                <Input
                  placeholder="Ex: PAN"
                  value={local.banco_emprestimo || ''}
                  onChange={e => update('banco_emprestimo', e.target.value.toUpperCase())}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Parcelas Pagas</label>
                <Select value={String(local.parcelas_pagas_min || 0)} onValueChange={v => update('parcelas_pagas_min', parseInt(v) || undefined)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARCELAS_PAGAS_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Valor da Parcela</label>
                <Select value={String(local.valor_parcela_min || 0)} onValueChange={v => update('valor_parcela_min', parseInt(v) || undefined)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VALOR_PARCELA_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Saldo Mínimo</label>
                <Input
                  type="number"
                  placeholder="Ex: 5000"
                  value={local.saldo_min || ''}
                  onChange={e => update('saldo_min', parseInt(e.target.value) || undefined)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Espécie do Benefício</label>
                <Select value={local.esp_filter || ''} onValueChange={v => update('esp_filter', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {ESP_FILTER_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Data Despacho (DDB)</label>
                <Select value={local.ddb_range || ''} onValueChange={v => update('ddb_range', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {DDB_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Possui Representante</label>
                <Select value={local.representante || ''} onValueChange={v => update('representante', v)}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleApply} className="gap-2">
                <Search className="h-4 w-4" />
                Buscar
              </Button>
              <Button variant="outline" onClick={handleClear} className="gap-2">
                <X className="h-4 w-4" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
