import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, CalendarIcon, FileSpreadsheet, FileJson, FileText, Loader2, Filter, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ACTIVATE_STATUS_CONFIG, ORIGEM_OPTIONS } from '../types';

interface ExportLeadsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leads: any[];
}

export const ExportLeadsModal = ({ isOpen, onOpenChange, leads }: ExportLeadsModalProps) => {
  const [exporting, setExporting] = useState(false);
  const [formatType, setFormatType] = useState<'csv' | 'xlsx' | 'json'>('csv');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    setExporting(true);
    setProgress(10);
    
    try {
      // Simulate processing
      setProgress(30);
      
      const filteredLeads = leads.filter(lead => {
        const leadDate = new Date(lead.created_at);
        const matchesDate = (!dateRange.from || leadDate >= startOfDay(dateRange.from)) && 
                           (!dateRange.to || leadDate <= startOfDay(dateRange.to));
        const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(lead.status);
        const matchesOrigin = selectedOrigins.length === 0 || selectedOrigins.includes(lead.origem);
        
        return matchesDate && matchesStatus && matchesOrigin;
      });

      setProgress(60);

      if (filteredLeads.length === 0) {
        toast({
          title: '⚠️ Nenhum dado encontrado',
          description: 'Não existem leads com os filtros selecionados.',
          variant: 'destructive'
        });
        setExporting(false);
        return;
      }

      setProgress(90);

      if (formatType === 'json') {
        const dataStr = JSON.stringify(filteredLeads, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', `leads_export_${format(new Date(), 'yyyy-MM-dd')}.json`);
        linkElement.click();
      } else {
        // Simple CSV generation
        const headers = ['ID', 'Nome', 'Telefone', 'Origem', 'Status', 'Data de Criação'];
        const rows = filteredLeads.map(l => [
          l.id,
          l.nome,
          l.telefone,
          l.origem,
          l.status,
          format(new Date(l.created_at), 'dd/MM/yyyy HH:mm')
        ]);
        
        const csvContent = [
          headers.join(','),
          ...rows.map(r => r.map(c => `"${c}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `leads_export_${format(new Date(), 'yyyy-MM-dd')}.${formatType}`);
        link.click();
      }

      setProgress(100);
      toast({
        title: '✅ Exportação concluída!',
        description: `${filteredLeads.length} leads exportados com sucesso.`
      });
      
      setTimeout(() => {
        onOpenChange(false);
        setExporting(false);
        setProgress(0);
      }, 1000);
      
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: '❌ Erro na exportação',
        description: error.message,
        variant: 'destructive'
      });
      setExporting(false);
    }
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const toggleOrigin = (origin: string) => {
    setSelectedOrigins(prev => 
      prev.includes(origin) ? prev.filter(o => o !== origin) : [...prev, origin]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Download className="h-6 w-6" />
            </div>
            Exportar Leads
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto px-1">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" /> Formato de Arquivo
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'csv', label: 'CSV', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
                { id: 'xlsx', label: 'Excel', icon: FileSpreadsheet, color: 'text-green-500', bg: 'bg-green-50' },
                { id: 'json', label: 'JSON', icon: FileJson, color: 'text-orange-500', bg: 'bg-orange-50' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setFormatType(fmt.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200",
                    formatType === fmt.id 
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                      : "border-muted hover:border-primary/50 hover:bg-accent"
                  )}
                >
                  <fmt.icon className={cn("h-8 w-8 mb-2", fmt.color)} />
                  <span className="text-sm font-medium">{fmt.label}</span>
                  {formatType === fmt.id && (
                    <motion.div layoutId="activeFormat" className="absolute top-2 right-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Date Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" /> Período
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground ml-1">De</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal border-2 h-11">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "P", { locale: ptBR }) : <span>Selecione</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground ml-1">Até</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal border-2 h-11">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "P", { locale: ptBR }) : <span>Selecione</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4" /> Status
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 border-2 rounded-xl bg-accent/30">
              {Object.entries(ACTIVATE_STATUS_CONFIG).map(([key, config]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`status-${key}`} 
                    checked={selectedStatuses.includes(key)}
                    onCheckedChange={() => toggleStatus(key)}
                    className="h-5 w-5"
                  />
                  <Label htmlFor={`status-${key}`} className="text-sm cursor-pointer flex items-center gap-1">
                    <span>{config.emoji}</span> {config.label}
                  </Label>
                </div>
              ))}
            </div>
            {selectedStatuses.length === 0 && (
              <p className="text-xs text-muted-foreground italic ml-1">Nenhum selecionado (exportará todos)</p>
            )}
          </div>

          {/* Origin Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Download className="h-4 w-4 rotate-180" /> Origem
            </Label>
            <div className="grid grid-cols-2 gap-2 p-3 border-2 rounded-xl bg-accent/30">
              {ORIGEM_OPTIONS.map((origin) => (
                <div key={origin} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`origin-${origin}`} 
                    checked={selectedOrigins.includes(origin)}
                    onCheckedChange={() => toggleOrigin(origin)}
                    className="h-5 w-5"
                  />
                  <Label htmlFor={`origin-${origin}`} className="text-sm cursor-pointer capitalize">
                    {origin}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Section */}
          <AnimatePresence>
            {exporting && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-2"
              >
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Processando exportação...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={exporting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={exporting}
            className="bg-primary hover:bg-primary/90 min-w-[140px]"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Iniciar Exportação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};