import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, History, AlertCircle, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ImportJob } from '../types';
import { ImportModal } from '../components/ImportModal';
import { ImportProgress } from '../components/ImportProgress';
import { formatDateTime } from '../utils';
import { toast } from 'sonner';

interface ImportEngineProps {
  onJobComplete?: () => void;
}

export function ImportEngine({ onJobComplete }: ImportEngineProps) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const fetchJobs = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('user_id', user.id)
        .ilike('module', 'baseoff%')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setJobs(data as unknown as ImportJob[]);
      
      // Check for active jobs
      const active = data?.find(j => j.status === 'processing' || j.status === 'chunk_completed');
      if (active) {
        setActiveJobId(active.id);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Polling for active job updates
  useEffect(() => {
    fetchJobs();
    
    const interval = setInterval(() => {
      if (activeJobId) {
        fetchJobs();
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [user, activeJobId]);

  // Watch for job completion
  useEffect(() => {
    const completedJob = jobs.find(j => j.id === activeJobId && j.status === 'completed');
    if (completedJob) {
      setActiveJobId(null);
      toast.success(`Importação concluída! ${completedJob.success_count} registros importados.`);
      onJobComplete?.();
    }
  }, [jobs, activeJobId, onJobComplete]);

  const handleJobCreated = (jobId: string) => {
    setActiveJobId(jobId);
    fetchJobs();
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('import_jobs')
        .update({ status: 'failed' })
        .eq('id', jobId);

      if (error) throw error;
      toast.info('Importação cancelada');
      setActiveJobId(null);
      fetchJobs();
    } catch (error) {
      console.error('Error canceling job:', error);
      toast.error('Erro ao cancelar importação');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('import_jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;
      toast.success('Registro removido');
      fetchJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Erro ao remover registro');
    }
  };

  const activeJob = jobs.find(j => j.id === activeJobId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Motor de Importação
          </h2>
          <p className="text-sm text-muted-foreground">
            Importe arquivos de até 2 milhões de linhas
          </p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          disabled={!!activeJobId}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          Importar Base Off
        </Button>
      </div>

      {/* Active Job Progress */}
      {activeJob && (
        <ImportProgress
          job={activeJob}
          onCancel={() => handleCancelJob(activeJob.id)}
          onClose={() => setActiveJobId(null)}
        />
      )}

      {/* Job History */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium flex items-center gap-2">
            <History className="w-4 h-4" />
            Histórico de Importações
          </h3>
          <Button variant="ghost" size="sm" onClick={fetchJobs}>
            <RefreshCw className={isLoading ? 'animate-spin' : ''} />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma importação realizada</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {jobs
                .filter(j => j.id !== activeJobId) // Don't show active job in history
                .map((job) => (
                <div 
                  key={job.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{job.file_name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{formatDateTime(job.created_at)}</span>
                      <span>•</span>
                      <span>{(job.success_count || 0).toLocaleString('pt-BR')} registros</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={job.status} />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteJob(job.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>

      {/* Import Modal */}
      <ImportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onJobCreated={handleJobCreated}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed: { label: 'Concluído', className: 'bg-green-100 text-green-700' },
    failed: { label: 'Falhou', className: 'bg-red-100 text-red-700' },
    processing: { label: 'Processando', className: 'bg-blue-100 text-blue-700' },
    chunk_completed: { label: 'Processando', className: 'bg-blue-100 text-blue-700' },
    uploaded: { label: 'Aguardando', className: 'bg-gray-100 text-gray-700' },
    paused: { label: 'Pausado', className: 'bg-yellow-100 text-yellow-700' },
  };

  const { label, className } = config[status] || config.uploaded;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
