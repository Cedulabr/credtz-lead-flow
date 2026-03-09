import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, DollarSign, MinusCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatMinutesToHM } from '@/lib/timeClockCalculations';

interface Props {
  users: { id: string; name: string }[];
  selectedUserId: string;
  currentBalance: number; // in minutes
  onCompensationAdded?: () => void;
}

export function HourBankCompensation({ users, selectedUserId, currentBalance, onCompensationAdded }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [targetUser, setTargetUser] = useState(selectedUserId);

  // Folga state
  const [folgaHours, setFolgaHours] = useState('');
  const [folgaDate, setFolgaDate] = useState(new Date().toISOString().split('T')[0]);
  const [folgaReason, setFolgaReason] = useState('');

  // Payment state
  const [payHours, setPayHours] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [payReason, setPayReason] = useState('');

  // Discount state
  const [discountHours, setDiscountHours] = useState('');
  const [discountReason, setDiscountReason] = useState('');

  const handleCompensation = async (type: 'compensacao_folga' | 'compensacao_pagamento' | 'desconto_folha', minutes: number, reason: string, rate?: number, total?: number) => {
    if (!user || minutes <= 0) return;
    setSaving(true);

    const referenceMonth = new Date().toISOString().substring(0, 7);
    const { error } = await supabase.from('hour_bank_entries').insert({
      user_id: targetUser,
      entry_type: type,
      minutes: -minutes, // compensations are always debit
      entry_date: new Date().toISOString().split('T')[0],
      reason,
      reference_month: referenceMonth,
      performed_by: user.id,
      hourly_rate: rate || null,
      total_value: total || null,
    });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Compensação registrada!' });
      onCompensationAdded?.();
    }
    setSaving(false);
  };

  const payTotal = (parseInt(payHours || '0') * 60) * (parseFloat(hourlyRate || '0') / 60);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Compensações</h3>
          <p className="text-sm text-muted-foreground">
            Saldo atual do colaborador: <span className={currentBalance >= 0 ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>
              {currentBalance >= 0 ? '+' : '-'}{formatMinutesToHM(Math.abs(currentBalance))}
            </span>
          </p>
        </div>
        {users.length > 0 && (
          <Select value={targetUser} onValueChange={setTargetUser}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue="folga">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="folga" className="text-xs sm:text-sm"><Gift className="h-4 w-4 mr-1" /> Folga</TabsTrigger>
          <TabsTrigger value="pagamento" className="text-xs sm:text-sm"><DollarSign className="h-4 w-4 mr-1" /> Pagamento</TabsTrigger>
          <TabsTrigger value="desconto" className="text-xs sm:text-sm"><MinusCircle className="h-4 w-4 mr-1" /> Desconto</TabsTrigger>
        </TabsList>

        <TabsContent value="folga">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compensar com Folga</CardTitle>
              <CardDescription>Converter horas positivas em folga compensada</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Horas a compensar</Label>
                  <Input type="number" min="1" value={folgaHours} onChange={e => setFolgaHours(e.target.value)} placeholder="Ex: 8" />
                </div>
                <div className="space-y-2">
                  <Label>Data da folga</Label>
                  <Input type="date" value={folgaDate} onChange={e => setFolgaDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Textarea value={folgaReason} onChange={e => setFolgaReason(e.target.value)} placeholder="Folga compensada por horas extras acumuladas" />
              </div>
              <Button 
                onClick={() => handleCompensation('compensacao_folga', parseInt(folgaHours || '0') * 60, folgaReason || 'Folga compensada')} 
                disabled={saving || !folgaHours} 
                className="w-full"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Gift className="h-4 w-4 mr-2" />}
                Registrar Folga Compensada
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagamento">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compensar com Pagamento</CardTitle>
              <CardDescription>Converter horas extras em pagamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Horas a pagar</Label>
                  <Input type="number" min="1" value={payHours} onChange={e => setPayHours(e.target.value)} placeholder="Ex: 4" />
                </div>
                <div className="space-y-2">
                  <Label>Valor da hora (R$)</Label>
                  <Input type="number" min="0" step="0.01" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="Ex: 25.00" />
                </div>
              </div>
              {payHours && hourlyRate && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Valor total: <span className="font-bold text-foreground">
                    R$ {(parseInt(payHours || '0') * parseFloat(hourlyRate || '0')).toFixed(2)}
                  </span></p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Textarea value={payReason} onChange={e => setPayReason(e.target.value)} placeholder="Pagamento de horas extras" />
              </div>
              <Button 
                onClick={() => handleCompensation(
                  'compensacao_pagamento', 
                  parseInt(payHours || '0') * 60, 
                  payReason || 'Pagamento de horas extras',
                  parseFloat(hourlyRate || '0'),
                  parseInt(payHours || '0') * parseFloat(hourlyRate || '0')
                )} 
                disabled={saving || !payHours || !hourlyRate} 
                className="w-full"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <DollarSign className="h-4 w-4 mr-2" />}
                Registrar Pagamento
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="desconto">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Desconto em Folha</CardTitle>
              <CardDescription>Registrar desconto de horas negativas na folha de pagamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Horas a descontar</Label>
                <Input type="number" min="1" value={discountHours} onChange={e => setDiscountHours(e.target.value)} placeholder="Ex: 2" />
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Textarea value={discountReason} onChange={e => setDiscountReason(e.target.value)} placeholder="Desconto de horas negativas acumuladas" />
              </div>
              <Button 
                onClick={() => handleCompensation('desconto_folha', parseInt(discountHours || '0') * 60, discountReason || 'Desconto em folha')} 
                disabled={saving || !discountHours} 
                className="w-full"
                variant="destructive"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MinusCircle className="h-4 w-4 mr-2" />}
                Registrar Desconto
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
