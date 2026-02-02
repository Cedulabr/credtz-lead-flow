import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarClock, Save, Loader2, Plus, Edit, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Schedule {
  id: string;
  user_id: string;
  daily_hours: number;
  monthly_hours: number;
  entry_time: string;
  exit_time: string;
  lunch_start: string | null;
  lunch_end: string | null;
  lunch_duration_minutes: number;
  tolerance_minutes: number;
  schedule_type: 'fixed' | 'flexible' | 'shift';
  work_days: number[];
  allow_overtime: boolean;
  max_overtime_daily_minutes: number;
  is_active: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

const WEEKDAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const SCHEDULE_TYPES = [
  { value: 'fixed', label: 'Fixo' },
  { value: 'flexible', label: 'Flexível' },
  { value: 'shift', label: 'Por Turno' },
];

export function ScheduleManager() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Partial<Schedule> | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const defaultSchedule: Partial<Schedule> = {
    daily_hours: 8,
    monthly_hours: 176,
    entry_time: '08:00',
    exit_time: '18:00',
    lunch_start: '12:00',
    lunch_end: '13:00',
    lunch_duration_minutes: 60,
    tolerance_minutes: 10,
    schedule_type: 'fixed',
    work_days: [1, 2, 3, 4, 5],
    allow_overtime: false,
    max_overtime_daily_minutes: 120,
    is_active: true,
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    const [schedulesRes, usersRes] = await Promise.all([
      supabase.from('time_clock_schedules').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name, email').eq('is_active', true).order('name'),
    ]);
    
    if (schedulesRes.data) {
      setSchedules(schedulesRes.data as unknown as Schedule[]);
    }
    if (usersRes.data) {
      setUsers(usersRes.data);
    }
    
    setLoading(false);
  };

  const getUserName = (userId: string) => {
    const userProfile = users.find(u => u.id === userId);
    return userProfile?.name || userProfile?.email || 'Desconhecido';
  };

  const getUsersWithoutSchedule = () => {
    const scheduledUserIds = schedules.map(s => s.user_id);
    return users.filter(u => !scheduledUserIds.includes(u.id));
  };

  const handleOpenCreate = () => {
    setEditingSchedule({ ...defaultSchedule });
    setShowModal(true);
  };

  const handleOpenEdit = (schedule: Schedule) => {
    setEditingSchedule({ ...schedule });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingSchedule?.user_id) {
      toast({ title: 'Selecione um colaborador', variant: 'destructive' });
      return;
    }

    setSaving(true);
    
    const scheduleData = {
      user_id: editingSchedule.user_id,
      daily_hours: editingSchedule.daily_hours || 8,
      monthly_hours: editingSchedule.monthly_hours || 176,
      entry_time: editingSchedule.entry_time || '08:00',
      exit_time: editingSchedule.exit_time || '18:00',
      lunch_start: editingSchedule.lunch_start || '12:00',
      lunch_end: editingSchedule.lunch_end || '13:00',
      lunch_duration_minutes: editingSchedule.lunch_duration_minutes || 60,
      tolerance_minutes: editingSchedule.tolerance_minutes || 10,
      schedule_type: editingSchedule.schedule_type || 'fixed',
      work_days: editingSchedule.work_days || [1, 2, 3, 4, 5],
      allow_overtime: editingSchedule.allow_overtime || false,
      max_overtime_daily_minutes: editingSchedule.max_overtime_daily_minutes || 120,
      is_active: editingSchedule.is_active !== false,
      created_by: user?.id,
    };

    let error;
    if (editingSchedule.id) {
      const result = await supabase
        .from('time_clock_schedules')
        .update(scheduleData)
        .eq('id', editingSchedule.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('time_clock_schedules')
        .insert(scheduleData);
      error = result.error;
    }

    if (error) {
      toast({ 
        title: 'Erro ao salvar jornada', 
        description: error.message, 
        variant: 'destructive' 
      });
    } else {
      toast({ title: 'Jornada salva com sucesso!' });
      setShowModal(false);
      setEditingSchedule(null);
      loadData();
    }

    setSaving(false);
  };

  const toggleWorkDay = (day: number) => {
    if (!editingSchedule) return;
    const currentDays = editingSchedule.work_days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    setEditingSchedule({ ...editingSchedule, work_days: newDays });
  };

  const formatWorkDays = (days: number[]) => {
    return days
      .sort()
      .map(d => WEEKDAYS.find(w => w.value === d)?.label)
      .filter(Boolean)
      .join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                Jornadas de Trabalho
              </CardTitle>
              <CardDescription>
                Configure a jornada de trabalho de cada colaborador
              </CardDescription>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Jornada
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarClock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma jornada cadastrada.</p>
              <Button variant="link" onClick={handleOpenCreate} className="mt-2">
                Cadastrar primeira jornada
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Carga Diária</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Tolerância</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {getUserName(schedule.user_id)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {schedule.entry_time?.slice(0, 5)} - {schedule.exit_time?.slice(0, 5)}
                      </TableCell>
                      <TableCell>{schedule.daily_hours}h</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatWorkDays(schedule.work_days || [])}
                        </span>
                      </TableCell>
                      <TableCell>{schedule.tolerance_minutes} min</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {SCHEDULE_TYPES.find(t => t.value === schedule.schedule_type)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                          {schedule.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(schedule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Cadastro/Edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              {editingSchedule?.id ? 'Editar Jornada' : 'Nova Jornada de Trabalho'}
            </DialogTitle>
            <DialogDescription>
              Configure os horários e regras da jornada de trabalho
            </DialogDescription>
          </DialogHeader>

          {editingSchedule && (
            <div className="space-y-6 py-4">
              {/* Seleção de Colaborador */}
              {!editingSchedule.id && (
                <div className="space-y-2">
                  <Label>Colaborador *</Label>
                  <Select
                    value={editingSchedule.user_id || ''}
                    onValueChange={(value) => setEditingSchedule({ ...editingSchedule, user_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {getUsersWithoutSchedule().map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Tipo de Escala */}
              <div className="space-y-2">
                <Label>Tipo de Escala</Label>
                <Select
                  value={editingSchedule.schedule_type || 'fixed'}
                  onValueChange={(value) => setEditingSchedule({ 
                    ...editingSchedule, 
                    schedule_type: value as 'fixed' | 'flexible' | 'shift' 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Horários */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entrada</Label>
                  <Input
                    type="time"
                    value={editingSchedule.entry_time || '08:00'}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, entry_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Saída</Label>
                  <Input
                    type="time"
                    value={editingSchedule.exit_time || '18:00'}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, exit_time: e.target.value })}
                  />
                </div>
              </div>

              {/* Pausa/Almoço */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Início Almoço</Label>
                  <Input
                    type="time"
                    value={editingSchedule.lunch_start || '12:00'}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, lunch_start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fim Almoço</Label>
                  <Input
                    type="time"
                    value={editingSchedule.lunch_end || '13:00'}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, lunch_end: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duração (min)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={editingSchedule.lunch_duration_minutes || 60}
                    onChange={(e) => setEditingSchedule({ 
                      ...editingSchedule, 
                      lunch_duration_minutes: parseInt(e.target.value) || 60 
                    })}
                  />
                </div>
              </div>

              {/* Carga Horária */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Carga Diária (horas)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    step="0.5"
                    value={editingSchedule.daily_hours || 8}
                    onChange={(e) => setEditingSchedule({ 
                      ...editingSchedule, 
                      daily_hours: parseFloat(e.target.value) || 8 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carga Mensal (horas)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="300"
                    value={editingSchedule.monthly_hours || 176}
                    onChange={(e) => setEditingSchedule({ 
                      ...editingSchedule, 
                      monthly_hours: parseFloat(e.target.value) || 176 
                    })}
                  />
                </div>
              </div>

              {/* Tolerância */}
              <div className="space-y-2">
                <Label>Tolerância de Atraso (minutos)</Label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={editingSchedule.tolerance_minutes || 10}
                  onChange={(e) => setEditingSchedule({ 
                    ...editingSchedule, 
                    tolerance_minutes: parseInt(e.target.value) || 10 
                  })}
                />
              </div>

              {/* Dias de Trabalho */}
              <div className="space-y-2">
                <Label>Dias de Trabalho</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => (
                    <div
                      key={day.value}
                      className={`
                        flex items-center justify-center w-12 h-10 rounded-md border cursor-pointer transition-colors
                        ${(editingSchedule.work_days || []).includes(day.value)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted'
                        }
                      `}
                      onClick={() => toggleWorkDay(day.value)}
                    >
                      <span className="text-sm font-medium">{day.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hora Extra */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Permitir Hora Extra</Label>
                    <p className="text-sm text-muted-foreground">
                      Habilitar registro de horas extras
                    </p>
                  </div>
                  <Switch
                    checked={editingSchedule.allow_overtime || false}
                    onCheckedChange={(checked) => setEditingSchedule({ 
                      ...editingSchedule, 
                      allow_overtime: checked 
                    })}
                  />
                </div>
                
                {editingSchedule.allow_overtime && (
                  <div className="space-y-2">
                    <Label>Máximo HE por Dia (minutos)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="240"
                      value={editingSchedule.max_overtime_daily_minutes || 120}
                      onChange={(e) => setEditingSchedule({ 
                        ...editingSchedule, 
                        max_overtime_daily_minutes: parseInt(e.target.value) || 120 
                      })}
                    />
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Jornada Ativa</Label>
                  <p className="text-sm text-muted-foreground">
                    Jornadas inativas não são consideradas nos cálculos
                  </p>
                </div>
                <Switch
                  checked={editingSchedule.is_active !== false}
                  onCheckedChange={(checked) => setEditingSchedule({ 
                    ...editingSchedule, 
                    is_active: checked 
                  })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
