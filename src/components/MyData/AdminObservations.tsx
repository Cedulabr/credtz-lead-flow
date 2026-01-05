import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { UserData, UserDataStatus } from './types';
import { toast } from 'sonner';

interface AdminObservationsProps {
  data: UserData;
  onUpdateStatus: (status: UserDataStatus, observations: string, rejectionReason?: string) => Promise<void>;
}

export function AdminObservations({ data, onUpdateStatus }: AdminObservationsProps) {
  const [observations, setObservations] = useState(data.internal_observations || '');
  const [rejectionReason, setRejectionReason] = useState(data.rejection_reason || '');
  const [newStatus, setNewStatus] = useState<UserDataStatus>(data.status);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onUpdateStatus(
        newStatus, 
        observations, 
        newStatus === 'rejected' ? rejectionReason : undefined
      );
      toast.success('Cadastro atualizado com sucesso');
    } catch (error) {
      toast.error('Erro ao atualizar cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Painel Administrativo
        </CardTitle>
        <CardDescription>
          Gerencie o status e adicione observações internas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Alterar Status</Label>
          <Select value={newStatus} onValueChange={(v: UserDataStatus) => setNewStatus(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="incomplete">
                <span className="flex items-center gap-2">
                  🟡 Incompleto
                </span>
              </SelectItem>
              <SelectItem value="in_review">
                <span className="flex items-center gap-2">
                  🔵 Em Análise
                </span>
              </SelectItem>
              <SelectItem value="approved">
                <span className="flex items-center gap-2">
                  🟢 Aprovado
                </span>
              </SelectItem>
              <SelectItem value="rejected">
                <span className="flex items-center gap-2">
                  🔴 Reprovado
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {newStatus === 'rejected' && (
          <div>
            <Label>Motivo da Reprovação</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Descreva o motivo da reprovação..."
              rows={2}
            />
          </div>
        )}

        <div>
          <Label>Observações Internas</Label>
          <Textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Adicione observações internas (visíveis apenas para admin/gestor)..."
            rows={4}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
          
          {newStatus !== 'approved' && (
            <Button
              variant="outline"
              onClick={() => {
                setNewStatus('approved');
                handleSubmit();
              }}
              disabled={loading}
              className="text-green-600"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Aprovar
            </Button>
          )}
          
          {newStatus !== 'rejected' && (
            <Button
              variant="outline"
              onClick={() => setNewStatus('rejected')}
              disabled={loading}
              className="text-red-600"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reprovar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
