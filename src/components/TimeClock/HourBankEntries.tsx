import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Loader2, ListPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatMinutesToHM } from '@/lib/timeClockCalculations';
import type { HourBankEntry, HourBankEntryType } from './types';
import { hourBankEntryTypeLabels, hourBankEntryTypeColors } from './types';

interface Props {
  users: { id: string; name: string }[];
  selectedUserId: string;
  onEntryAdded?: () => void;
}

const entryTypes: { value: HourBankEntryType; label: string; isCredit: boolean }[] = [
  { value: 'hora_extra', label: 'Hora Extra (crédito)', isCredit: true },
  { value: 'ajuste_manual', label: 'Ajuste Manual (crédito)', isCredit: true },
  { value: 'atraso', label: 'Atraso (débito)', isCredit: false },
  { value: 'saida_antecipada', label: 'Saída Antecipada (débito)', isCredit: false },
  { value: 'falta', label: 'Falta (débito)', isCredit: false },
];

export function HourBankEntries({ users, selectedUserId, onEntryAdded }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<HourBankEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    user_id: selectedUserId,
    entry_type: '' as HourBankEntryType | '',
    hours: '',
    minutes: '',
    entry_date: new Date().toISOString().split('T')[0],
    reason: '',
  });

  useEffect(() => {
    if (selectedUserId) loadEntries();
  }, [selectedUserId]);

  useEffect(() => {
    setForm(f => ({ ...f, user_id: selectedUserId }));
  }, [selectedUserId]);

  const loadEntries = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('hour_bank_entries')
      .select('*')
      .eq('user_id', selectedUserId)
      .order('entry_date', { ascending: false })
      .limit(100);
    setEntries((data as HourBankEntry[]) || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.entry_type || !form.entry_date || !user) return;
    const totalMinutes = (parseInt(form.hours || '0') * 60) + parseInt(form.minutes || '0');
    if (totalMinutes <= 0) {
      toast({ title: 'Informe a quantidade de horas/minutos', variant: 'destructive' });
      return;
    }

    const isCredit = entryTypes.find(e => e.value === form.entry_type)?.isCredit ?? false;
    const finalMinutes = isCredit ? totalMinutes : -totalMinutes;

    const referenceMonth = form.entry_date.substring(0, 7);

    setSaving(true);
    const { error } = await supabase.from('hour_bank_entries').insert({
      user_id: form.user_id,
      entry_type: form.entry_type,
      minutes: finalMinutes,
      entry_date: form.entry_date,
      reason: form.reason || null,
      reference_month: referenceMonth,
      performed_by: user.id,
    });

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Lançamento registrado com sucesso!' });
      setDialogOpen(false);
      setForm({ user_id: selectedUserId, entry_type: '', hours: '', minutes: '', entry_date: new Date().toISOString().split('T')[0], reason: '' });
      loadEntries();
      onEntryAdded?.();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ListPlus className="h-5 w-5" />
          Lançamentos Manuais
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Lançamento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Lançamento de Horas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Colaborador</Label>
                <Select value={form.user_id} onValueChange={v => setForm(f => ({ ...f, user_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Lançamento</Label>
                <Select value={form.entry_type} onValueChange={v => setForm(f => ({ ...f, entry_type: v as HourBankEntryType }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    {entryTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Horas</Label>
                  <Input type="number" min="0" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Minutos</Label>
                  <Input type="number" min="0" max="59" value={form.minutes} onChange={e => setForm(f => ({ ...f, minutes: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Descreva o motivo do lançamento" />
              </div>
              <Button onClick={handleSubmit} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Registrar Lançamento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum lançamento manual encontrado.</CardContent></Card>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Ref.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell>{format(new Date(entry.entry_date + 'T12:00:00'), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <Badge className={hourBankEntryTypeColors[entry.entry_type as HourBankEntryType] || ''}>
                      {hourBankEntryTypeLabels[entry.entry_type as HourBankEntryType] || entry.entry_type}
                    </Badge>
                  </TableCell>
                  <TableCell className={entry.minutes >= 0 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                    {entry.minutes >= 0 ? '+' : '-'}{formatMinutesToHM(Math.abs(entry.minutes))}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{entry.reason || '-'}</TableCell>
                  <TableCell>{entry.reference_month}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
