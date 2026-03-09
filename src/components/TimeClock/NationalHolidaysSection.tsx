import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Flag, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getBrazilianHolidays, type BrazilianHoliday } from './brazilianHolidays';

interface NationalHolidaysSectionProps {
  year: number;
  companyId: string;
  users: { id: string; name: string }[];
  existingHolidayDates: string[]; // dates already registered as 'feriado'
  onHolidaysApplied: () => void;
}

export function NationalHolidaysSection({
  year,
  companyId,
  users,
  existingHolidayDates,
  onHolidaysApplied,
}: NationalHolidaysSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  const holidays = getBrazilianHolidays(year);

  const toggleSelect = (date: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const selectAll = () => {
    const available = holidays.filter((h) => !existingHolidayDates.includes(h.date)).map((h) => h.date);
    setSelected(new Set(available));
  };

  const handleApply = async () => {
    if (selected.size === 0 || users.length === 0) return;
    setApplying(true);

    try {
      const selectedHolidays = holidays.filter((h) => selected.has(h.date));
      const inserts: any[] = [];

      for (const holiday of selectedHolidays) {
        // Delete existing entries for this date
        const userIds = users.map((u) => u.id);
        await supabase
          .from('time_clock_day_offs')
          .delete()
          .in('user_id', userIds)
          .eq('off_date', holiday.date)
          .eq('company_id', companyId);

        for (const u of users) {
          inserts.push({
            user_id: u.id,
            company_id: companyId,
            off_date: holiday.date,
            off_type: 'feriado',
            reason: holiday.name,
            is_partial_day: false,
            start_time: null,
            end_time: null,
            created_by: user?.id,
          });
        }
      }

      const { error } = await supabase.from('time_clock_day_offs').insert(inserts);
      if (error) throw error;

      toast({
        title: `${selectedHolidays.length} feriado(s) aplicado(s) para ${users.length} colaborador(es)!`,
      });
      setSelected(new Set());
      onHolidaysApplied();
    } catch (error: any) {
      console.error('Erro ao aplicar feriados:', error);
      toast({ title: 'Erro ao aplicar feriados', description: error.message, variant: 'destructive' });
    }
    setApplying(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Feriados Nacionais — {year}
            </CardTitle>
            <CardDescription>
              Selecione os feriados para aplicar automaticamente como folga para todos os colaboradores
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Selecionar pendentes
            </Button>
            <Button size="sm" onClick={handleApply} disabled={applying || selected.size === 0}>
              {applying && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Aplicar {selected.size > 0 ? `(${selected.size})` : ''}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>Data</TableHead>
                <TableHead>Feriado</TableHead>
                <TableHead>Dia da Semana</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.map((h) => {
                const alreadyApplied = existingHolidayDates.includes(h.date);
                return (
                  <TableRow key={h.date}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(h.date)}
                        onCheckedChange={() => toggleSelect(h.date)}
                        disabled={alreadyApplied}
                      />
                    </TableCell>
                    <TableCell>
                      {format(parseISO(h.date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{h.dayOfWeek}</TableCell>
                    <TableCell>
                      {alreadyApplied ? (
                        <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Já lançado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Pendente</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
