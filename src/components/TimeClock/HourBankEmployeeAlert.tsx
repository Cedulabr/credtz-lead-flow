import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatMinutesToHM } from '@/lib/timeClockCalculations';

interface CompensationRequest {
  id: string;
  total_minutes: number;
  compensated_minutes: number;
  daily_limit_minutes: number;
  status: string;
  reason: string | null;
  created_at: string;
}

export function HourBankEmployeeAlert() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CompensationRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('hour_bank_compensation_requests')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false });
    setRequests((data as CompensationRequest[]) || []);
  };

  if (requests.length === 0) return null;

  return (
    <div className="space-y-3">
      {requests.map(req => {
        const remaining = req.total_minutes - req.compensated_minutes;
        const progress = req.total_minutes > 0 ? (req.compensated_minutes / req.total_minutes) * 100 : 0;
        const daysEstimate = Math.ceil(remaining / req.daily_limit_minutes);

        return (
          <Alert key={req.id} variant="destructive" className="border-red-300 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              Compensação de Horas Pendente
              <Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-200">
                {req.status === 'pending' ? 'Pendente' : 'Em andamento'}
              </Badge>
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p className="text-sm text-red-800">
                Você possui <strong>{formatMinutesToHM(req.total_minutes)}</strong> para compensar.
                {req.reason && <span className="text-red-600"> Motivo: {req.reason}</span>}
              </p>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-red-700">
                  <span>Compensado: {formatMinutesToHM(req.compensated_minutes)}</span>
                  <span>Restante: {formatMinutesToHM(remaining)}</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-red-600">
                <Clock className="h-3 w-3" />
                Compensação de {req.daily_limit_minutes}min/dia • ~{daysEstimate} dias úteis restantes
              </div>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
