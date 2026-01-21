import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Pause, 
  Play,
  X,
  FileText
} from 'lucide-react';
import { ImportJob, ImportStatus } from '../types';
import { formatFileSize, calculateProgress, formatDateTime } from '../utils';
import { cn } from '@/lib/utils';

interface ImportProgressProps {
  job: ImportJob;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

const statusConfig: Record<ImportStatus, { label: string; icon: React.ReactNode; color: string }> = {
  uploaded: { 
    label: 'Aguardando', 
    icon: <FileText className="w-5 h-5" />, 
    color: 'bg-gray-100 text-gray-700' 
  },
  processing: { 
    label: 'Processando', 
    icon: <Loader2 className="w-5 h-5 animate-spin" />, 
    color: 'bg-blue-100 text-blue-700' 
  },
  chunk_completed: { 
    label: 'Processando', 
    icon: <Loader2 className="w-5 h-5 animate-spin" />, 
    color: 'bg-blue-100 text-blue-700' 
  },
  paused: { 
    label: 'Pausado', 
    icon: <Pause className="w-5 h-5" />, 
    color: 'bg-yellow-100 text-yellow-700' 
  },
  completed: { 
    label: 'Concluído', 
    icon: <CheckCircle className="w-5 h-5" />, 
    color: 'bg-green-100 text-green-700' 
  },
  failed: { 
    label: 'Falhou', 
    icon: <XCircle className="w-5 h-5" />, 
    color: 'bg-red-100 text-red-700' 
  },
};

export function ImportProgress({ job, onPause, onResume, onCancel, onClose }: ImportProgressProps) {
  const status = statusConfig[job.status] || statusConfig.processing;
  const progress = calculateProgress(job.processed_rows, job.total_rows);
  const hasErrors = (job.error_count || 0) > 0;
  const isActive = job.status === 'processing' || job.status === 'chunk_completed';
  const isCompleted = job.status === 'completed' || job.status === 'failed';

  return (
    <Card className="p-4 border-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-xl', status.color)}>
            {status.icon}
          </div>
          <div>
            <h3 className="font-semibold text-base truncate max-w-[200px]">{job.file_name}</h3>
            <p className="text-sm text-muted-foreground">{formatFileSize(job.file_size_bytes)}</p>
          </div>
        </div>
        <Badge className={status.color}>{status.label}</Badge>
      </div>

      {/* Progress */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-3" />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{(job.processed_rows || 0).toLocaleString('pt-BR')} linhas</span>
          <span>de {(job.total_rows || 0).toLocaleString('pt-BR')}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <p className="text-lg font-bold text-green-700">{(job.success_count || 0).toLocaleString('pt-BR')}</p>
          <p className="text-xs text-green-600">Sucesso</p>
        </div>
        <div className="text-center p-2 bg-yellow-50 rounded-lg">
          <p className="text-lg font-bold text-yellow-700">{(job.duplicate_count || 0).toLocaleString('pt-BR')}</p>
          <p className="text-xs text-yellow-600">Duplicados</p>
        </div>
        <div className="text-center p-2 bg-red-50 rounded-lg">
          <p className="text-lg font-bold text-red-700">{(job.error_count || 0).toLocaleString('pt-BR')}</p>
          <p className="text-xs text-red-600">Erros</p>
        </div>
      </div>

      {/* Error Alert */}
      {hasErrors && job.error_log && (
        <div className="mb-4 p-3 bg-red-50 rounded-xl border border-red-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-red-700">Erros encontrados</p>
              <p className="text-red-600 text-xs mt-1">
                {Array.isArray(job.error_log) && job.error_log.length > 0
                  ? `${job.error_log.length} erros registrados`
                  : 'Verifique o log de erros'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Timestamps */}
      {job.started_at && (
        <div className="text-xs text-muted-foreground mb-4 space-y-1">
          <p>Iniciado: {formatDateTime(job.started_at)}</p>
          {job.completed_at && <p>Concluído: {formatDateTime(job.completed_at)}</p>}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isActive && (
          <>
            {onPause && job.status !== 'paused' && (
              <Button variant="outline" size="sm" onClick={onPause} className="flex-1">
                <Pause className="w-4 h-4 mr-1" />
                Pausar
              </Button>
            )}
            {onResume && job.status === 'paused' && (
              <Button variant="outline" size="sm" onClick={onResume} className="flex-1">
                <Play className="w-4 h-4 mr-1" />
                Retomar
              </Button>
            )}
            {onCancel && (
              <Button variant="destructive" size="sm" onClick={onCancel} className="flex-1">
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
            )}
          </>
        )}
        {isCompleted && onClose && (
          <Button variant="outline" size="sm" onClick={onClose} className="w-full">
            Fechar
          </Button>
        )}
      </div>
    </Card>
  );
}
