import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, Plus, Loader2, CheckCircle, XCircle, Clock, 
  AlertTriangle, User, Calendar, MessageSquare, Upload, ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Justification {
  id: string;
  user_id: string;
  reference_date: string;
  justification_type: string;
  description: string;
  attachment_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  minutes_affected: number;
  created_at: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

const JUSTIFICATION_TYPES = [
  { value: 'delay', label: 'Atraso', icon: Clock },
  { value: 'absence', label: 'Falta', icon: XCircle },
  { value: 'forgot_clock', label: 'Esquecimento de Ponto', icon: AlertTriangle },
  { value: 'early_leave', label: 'Saída Antecipada', icon: Clock },
  { value: 'medical', label: 'Atestado Médico', icon: FileText },
  { value: 'other', label: 'Outros', icon: MessageSquare },
];

const STATUS_CONFIG = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Aprovada', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejeitada', color: 'bg-red-100 text-red-800', icon: XCircle },
};

interface JustificationManagerProps {
  isManager?: boolean;
}

export function JustificationManager({ isManager = false }: JustificationManagerProps) {
  const [loading, setLoading] = useState(false);
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedJustification, setSelectedJustification] = useState<Justification | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  
  const [newJustification, setNewJustification] = useState({
    reference_date: format(new Date(), 'yyyy-MM-dd'),
    justification_type: 'delay',
    description: '',
    minutes_affected: 0,
  });

  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    loadData();
  }, [isManager, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    
    let query = supabase
      .from('time_clock_justifications')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!isManager && !isAdmin) {
      query = query.eq('user_id', user?.id);
    }
    
    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }
    
    const [justificationsRes, usersRes] = await Promise.all([
      query,
      supabase.from('profiles').select('id, name, email').eq('is_active', true),
    ]);
    
    if (justificationsRes.data) {
      setJustifications(justificationsRes.data as Justification[]);
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

  const getTypeLabel = (type: string) => {
    return JUSTIFICATION_TYPES.find(t => t.value === type)?.label || type;
  };

  const uploadAttachment = async (): Promise<string | null> => {
    if (!attachmentFile || !user) return null;
    setUploadingFile(true);
    try {
      const ext = attachmentFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('time-clock-documents')
        .upload(fileName, attachmentFile);
      
      if (error) throw error;
      
      const { data } = supabase.storage.from('time-clock-documents').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error: any) {
      toast({ title: 'Erro ao enviar arquivo', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCreate = async () => {
    if (!newJustification.description.trim()) {
      toast({ title: 'Informe a descrição', variant: 'destructive' });
      return;
    }

    setLoading(true);
    
    let attachmentUrl: string | null = null;
    if (attachmentFile) {
      attachmentUrl = await uploadAttachment();
    }

    const { error } = await supabase
      .from('time_clock_justifications')
      .insert({
        user_id: user?.id,
        reference_date: newJustification.reference_date,
        justification_type: newJustification.justification_type,
        description: newJustification.description,
        minutes_affected: newJustification.minutes_affected,
        attachment_url: attachmentUrl,
      });

    if (error) {
      toast({ 
        title: 'Erro ao enviar justificativa', 
        description: error.message, 
        variant: 'destructive' 
      });
    } else {
      toast({ title: 'Justificativa enviada com sucesso!' });
      setShowCreateModal(false);
      setNewJustification({
        reference_date: format(new Date(), 'yyyy-MM-dd'),
        justification_type: 'delay',
        description: '',
        minutes_affected: 0,
      });
      setAttachmentFile(null);
      loadData();
    }

    setLoading(false);
  };

  const handleReview = async (approved: boolean) => {
    if (!selectedJustification) return;

    setLoading(true);
    
    const { error } = await supabase
      .from('time_clock_justifications')
      .update({
        status: approved ? 'approved' : 'rejected',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: reviewNotes || null,
      })
      .eq('id', selectedJustification.id);

    if (error) {
      toast({ 
        title: 'Erro ao revisar justificativa', 
        description: error.message, 
        variant: 'destructive' 
      });
    } else {
      toast({ 
        title: approved ? 'Justificativa aprovada!' : 'Justificativa rejeitada',
      });
      setShowReviewModal(false);
      setSelectedJustification(null);
      setReviewNotes('');
      loadData();
    }

    setLoading(false);
  };

  const pendingCount = justifications.filter(j => j.status === 'pending').length;

  if (loading && justifications.length === 0) {
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
                <FileText className="h-5 w-5" />
                {isManager ? 'Aprovar Justificativas' : 'Minhas Justificativas'}
                {pendingCount > 0 && (
                  <Badge variant="destructive">{pendingCount} pendente(s)</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {isManager 
                  ? 'Revise e aprove as justificativas da equipe' 
                  : 'Envie justificativas para atrasos, faltas e ocorrências'
                }
              </CardDescription>
            </div>
            {!isManager && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Justificativa
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="approved">Aprovadas</SelectItem>
                <SelectItem value="rejected">Rejeitadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {justifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma justificativa encontrada.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isManager && <TableHead>Colaborador</TableHead>}
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Anexo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {justifications.map((justification) => {
                    const StatusIcon = STATUS_CONFIG[justification.status].icon;
                    return (
                      <TableRow key={justification.id}>
                        {isManager && (
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {getUserName(justification.user_id)}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          {format(parseISO(justification.reference_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getTypeLabel(justification.justification_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {justification.description}
                        </TableCell>
                        <TableCell>
                          {justification.attachment_url ? (
                            <a
                              href={justification.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline text-sm"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Ver
                            </a>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_CONFIG[justification.status].color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {STATUS_CONFIG[justification.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isManager && justification.status === 'pending' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedJustification(justification);
                                setShowReviewModal(true);
                              }}
                            >
                              Revisar
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedJustification(justification);
                                setShowReviewModal(true);
                              }}
                            >
                              Ver
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Nova Justificativa
            </DialogTitle>
            <DialogDescription>
              Envie uma justificativa para atraso, falta ou ocorrência
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Referência *</Label>
                <Input
                  type="date"
                  value={newJustification.reference_date}
                  onChange={(e) => setNewJustification({ ...newJustification, reference_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={newJustification.justification_type}
                  onValueChange={(value) => setNewJustification({ ...newJustification, justification_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JUSTIFICATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Minutos Afetados</Label>
              <Input
                type="number"
                min="0"
                value={newJustification.minutes_affected}
                onChange={(e) => setNewJustification({ ...newJustification, minutes_affected: parseInt(e.target.value) || 0 })}
                placeholder="Ex: 30 (para 30 minutos de atraso)"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={newJustification.description}
                onChange={(e) => setNewJustification({ ...newJustification, description: e.target.value })}
                placeholder="Descreva o motivo da justificativa..."
                rows={4}
              />
            </div>

            {/* File upload */}
            <div className="space-y-2">
              <Label>Anexo (atestado, comprovante)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                {attachmentFile && (
                  <Badge variant="secondary" className="text-xs">
                    {attachmentFile.name.substring(0, 20)}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Formatos aceitos: imagens e PDF</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateModal(false); setAttachmentFile(null); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={loading || uploadingFile}>
              {(loading || uploadingFile) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isManager && selectedJustification?.status === 'pending' 
                ? 'Revisar Justificativa' 
                : 'Detalhes da Justificativa'
              }
            </DialogTitle>
          </DialogHeader>

          {selectedJustification && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Colaborador</Label>
                  <p className="font-medium">{getUserName(selectedJustification.user_id)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data</Label>
                  <p className="font-medium">
                    {format(parseISO(selectedJustification.reference_date), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Tipo</Label>
                  <Badge variant="outline">
                    {getTypeLabel(selectedJustification.justification_type)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Minutos Afetados</Label>
                  <p className="font-medium">{selectedJustification.minutes_affected} min</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="mt-1 p-3 bg-muted rounded-md text-sm">
                  {selectedJustification.description}
                </p>
              </div>

              {/* Attachment preview */}
              {selectedJustification.attachment_url && (
                <div>
                  <Label className="text-muted-foreground">Documento Anexo</Label>
                  <div className="mt-1">
                    {selectedJustification.attachment_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img
                        src={selectedJustification.attachment_url}
                        alt="Anexo"
                        className="max-w-full max-h-[200px] rounded-md border"
                      />
                    ) : (
                      <a
                        href={selectedJustification.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline p-3 bg-muted rounded-md"
                      >
                        <FileText className="h-5 w-5" />
                        Abrir documento anexo
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Status</Label>
                <Badge className={STATUS_CONFIG[selectedJustification.status].color}>
                  {STATUS_CONFIG[selectedJustification.status].label}
                </Badge>
              </div>

              {selectedJustification.reviewer_notes && (
                <div>
                  <Label className="text-muted-foreground">Observação do Revisor</Label>
                  <p className="mt-1 p-3 bg-muted rounded-md text-sm">
                    {selectedJustification.reviewer_notes}
                  </p>
                </div>
              )}

              {isManager && selectedJustification.status === 'pending' && (
                <div className="space-y-2">
                  <Label>Observação (opcional)</Label>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Adicione uma observação..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {isManager && selectedJustification?.status === 'pending' ? (
              <>
                <Button 
                  variant="destructive" 
                  onClick={() => handleReview(false)}
                  disabled={loading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeitar
                </Button>
                <Button 
                  onClick={() => handleReview(true)}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprovar
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setShowReviewModal(false)}>
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
