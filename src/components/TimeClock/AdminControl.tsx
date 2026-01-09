import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Users, Download, Clock, MapPin, Image, Edit, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTimeClock } from '@/hooks/useTimeClock';
import { clockTypeLabels, statusLabels, statusColors, type TimeClock, type TimeClockType, type TimeClockStatus } from './types';
import { format, startOfMonth, endOfMonth, parseISO, differenceInMinutes, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export function AdminControl() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [records, setRecords] = useState<TimeClock[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TimeClock | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustTime, setAdjustTime] = useState('');
  const [lateUsers, setLateUsers] = useState<{ user: UserProfile; count: number }[]>([]);

  const { getAllUsersHistory, adjustClock } = useTimeClock(undefined);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [startDate, endDate, selectedUser]);

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email')
      .order('name');
    if (data) setUsers(data);
  };

  const loadRecords = async () => {
    setLoading(true);
    let query = supabase
      .from('time_clock')
      .select('*')
      .gte('clock_date', startDate)
      .lte('clock_date', endDate)
      .order('clock_date', { ascending: false })
      .order('clock_time', { ascending: true });

    if (selectedUser !== 'all') {
      query = query.eq('user_id', selectedUser);
    }

    const { data } = await query;
    setRecords((data as TimeClock[]) || []);
    calculateLateUsers(data as TimeClock[]);
    setLoading(false);
  };

  const calculateLateUsers = (data: TimeClock[]) => {
    // Agrupar por usuário e contar atrasos (entradas após 08:10)
    const userLates: Record<string, number> = {};
    data?.forEach((record) => {
      if (record.clock_type === 'entrada') {
        const time = format(parseISO(record.clock_time), 'HH:mm');
        if (time > '08:10') {
          userLates[record.user_id] = (userLates[record.user_id] || 0) + 1;
        }
      }
    });

    const result = Object.entries(userLates)
      .map(([userId, count]) => ({
        user: users.find((u) => u.id === userId) || { id: userId, name: 'Desconhecido', email: '' },
        count,
      }))
      .sort((a, b) => b.count - a.count);

    setLateUsers(result);
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.name || user?.email || 'Desconhecido';
  };

  const handleAdjust = async () => {
    if (!selectedRecord || !adjustTime || !adjustReason) return;
    
    const newTime = `${selectedRecord.clock_date}T${adjustTime}:00`;
    const success = await adjustClock(selectedRecord.id, newTime, adjustReason);
    
    if (success) {
      setShowAdjustModal(false);
      setAdjustReason('');
      setAdjustTime('');
      setSelectedRecord(null);
      loadRecords();
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Relatório de Controle de Ponto', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Período: ${format(parseISO(startDate), 'dd/MM/yyyy')} a ${format(parseISO(endDate), 'dd/MM/yyyy')}`, 105, 25, { align: 'center' });

    let yPos = 40;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Colaborador', 14, yPos);
    doc.text('Data', 60, yPos);
    doc.text('Tipo', 90, yPos);
    doc.text('Horário', 120, yPos);
    doc.text('Local', 150, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    records.forEach((record) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.text(getUserName(record.user_id).substring(0, 20), 14, yPos);
      doc.text(format(parseISO(record.clock_date), 'dd/MM/yyyy'), 60, yPos);
      doc.text(clockTypeLabels[record.clock_type as TimeClockType], 90, yPos);
      doc.text(format(parseISO(record.clock_time), 'HH:mm'), 120, yPos);
      doc.text(record.city ? `${record.city}/${record.state}` : '-', 150, yPos);
      yPos += 6;
    });

    doc.save(`relatorio-ponto-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportLateReport = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Relatório de Atrasos', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Período: ${format(parseISO(startDate), 'dd/MM/yyyy')} a ${format(parseISO(endDate), 'dd/MM/yyyy')}`, 105, 25, { align: 'center' });

    let yPos = 40;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Colaborador', 14, yPos);
    doc.text('Quantidade de Atrasos', 100, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    lateUsers.forEach((item) => {
      doc.text(item.user.name || item.user.email, 14, yPos);
      doc.text(item.count.toString(), 100, yPos);
      yPos += 6;
    });

    doc.save(`relatorio-atrasos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {lateUsers.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Colaboradores com Atrasos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lateUsers.slice(0, 5).map((item) => (
                <Badge key={item.user.id} variant="outline" className="bg-white">
                  {item.user.name || item.user.email}: {item.count} atraso(s)
                </Badge>
              ))}
            </div>
            <Button variant="link" onClick={exportLateReport} className="mt-2 p-0 h-auto text-yellow-800">
              Ver relatório completo
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Controle de Ponto
              </CardTitle>
              <CardDescription>Visualize e gerencie os registros de ponto da equipe</CardDescription>
            </div>
            <Button onClick={exportToPDF} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">De:</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Até:</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por colaborador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum registro encontrado no período.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {getUserName(record.user_id)}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(record.clock_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {clockTypeLabels[record.clock_type as TimeClockType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(record.clock_time), 'HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        {record.city ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {record.city}/{record.state}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[record.status as TimeClockStatus]}>
                          {statusLabels[record.status as TimeClockStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {record.photo_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedRecord(record);
                                setShowPhotoModal(true);
                              }}
                            >
                              <Image className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedRecord(record);
                              setAdjustTime(format(parseISO(record.clock_time), 'HH:mm'));
                              setShowAdjustModal(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Foto */}
      <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Foto do Registro</DialogTitle>
            <DialogDescription>
              {selectedRecord && (
                <>
                  {getUserName(selectedRecord.user_id)} - {format(parseISO(selectedRecord.clock_time), 'dd/MM/yyyy HH:mm')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedRecord?.photo_url && (
            <img
              src={selectedRecord.photo_url}
              alt="Foto do ponto"
              className="w-full rounded-lg"
            />
          )}
          {selectedRecord?.latitude && selectedRecord?.longitude && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {selectedRecord.city}, {selectedRecord.state}
              <span className="text-xs">
                ({selectedRecord.latitude.toFixed(6)}, {selectedRecord.longitude.toFixed(6)})
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Ajuste */}
      <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Horário</DialogTitle>
            <DialogDescription>
              Informe o novo horário e a justificativa para o ajuste.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Novo Horário</label>
              <Input
                type="time"
                value={adjustTime}
                onChange={(e) => setAdjustTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Justificativa</label>
              <Textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Informe o motivo do ajuste..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdjust} disabled={!adjustTime || !adjustReason}>
              Salvar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
