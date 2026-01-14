import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw,
  AlertCircle,
  Loader2,
  Cloud,
  Database,
  ArrowLeft,
  History,
  Zap
} from 'lucide-react';
import { useImportJobPolling } from '@/hooks/useImportJobPolling';

interface ImportJob {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string | null;
  file_size_bytes: number;
  status: string;
  total_rows: number | null;
  processed_rows: number | null;
  error_log: any;
  created_at: string;
  updated_at: string;
  last_processed_offset: number | null;
  chunk_metadata: any;
  processing_started_at: string | null;
  processing_ended_at: string | null;
}

type Phase = 'select' | 'uploading' | 'processing' | 'completed' | 'error' | 'jobs';

interface BaseOffStorageImportProps {
  onBack?: () => void;
  onClose?: () => void;
}

const BaseOffStorageImport: React.FC<BaseOffStorageImportProps> = ({ onBack, onClose }) => {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use the polling hook
  const { job: currentJob, progress: processingProgress, isPolling } = useImportJobPolling({
    jobId: currentJobId,
    enabled: phase === 'processing',
    pollingInterval: 2000,
    onComplete: (job) => {
      setPhase('completed');
      toast.success(`Importação concluída! ${job.processed_rows} linhas processadas.`);
    },
    onError: (job) => {
      setPhase('error');
      const errors = job.error_log;
      setErrorMessage(errors?.[0]?.error || 'Erro desconhecido durante o processamento');
      toast.error('Erro na importação');
    },
    onChunkComplete: (job) => {
      toast.info(`Processando chunk... ${job.processed_rows}/${job.total_rows} linhas`);
    }
  });

  // Load previous jobs
  const loadJobs = useCallback(async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('Error loading jobs:', error);
      return;
    }
    
    setJobs(data as unknown as ImportJob[]);
  }, [user?.id]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const extension = file.name.toLowerCase().split('.').pop();
    if (!['csv', 'xlsx', 'xls'].includes(extension || '')) {
      toast.error('Formato inválido. Use CSV, XLSX ou XLS.');
      return;
    }
    
    // 600MB limit
    if (file.size > 600 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Limite: 600MB');
      return;
    }
    
    setSelectedFile(file);
    setErrorMessage(null);
  };

  const resetState = () => {
    setPhase('select');
    setSelectedFile(null);
    setUploadProgress(0);
    setCurrentJobId(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startImport = async () => {
    if (!selectedFile || !user?.id) return;
    
    try {
      setPhase('uploading');
      setUploadProgress(0);
      
      // Generate unique storage path
      const timestamp = Date.now();
      const storagePath = `${user.id}/${timestamp}_${selectedFile.name}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase
        .storage
        .from('imports')
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }
      
      setUploadProgress(100);
      
      // Create import job record
      const { data: jobData, error: jobError } = await supabase
        .from('import_jobs')
        .insert([{
          user_id: user.id,
          file_name: selectedFile.name,
          file_path: storagePath,
          file_size_bytes: selectedFile.size,
          status: 'uploaded',
          module: 'baseoff'
        }])
        .select()
        .single();
      
      if (jobError || !jobData) {
        throw new Error(`Erro ao criar job: ${jobError?.message}`);
      }
      
      const job = jobData as unknown as ImportJob;
      setCurrentJobId(job.id);
      setPhase('processing');
      
      // Call Edge Function to start processing
      const { error: fnError } = await supabase.functions.invoke('process-import', {
        body: { job_id: job.id }
      });
      
      if (fnError) {
        console.error('Edge function error:', fnError);
        // Don't throw - the polling will detect the status
      }
      
      toast.success('Processamento iniciado no servidor!');
      
    } catch (error) {
      console.error('Import error:', error);
      setPhase('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido');
      toast.error('Erro na importação');
    }
  };

  const resumeJob = async (job: ImportJob) => {
    if (job.status !== 'chunk_completed' && job.status !== 'failed') {
      toast.error('Este job não pode ser retomado');
      return;
    }
    
    setCurrentJobId(job.id);
    setPhase('processing');
    
    const nextOffset = job.chunk_metadata?.next_offset || job.last_processed_offset || 0;
    
    const { error } = await supabase.functions.invoke('process-import', {
      body: { job_id: job.id, continue_from_offset: nextOffset }
    });
    
    if (error) {
      toast.error('Erro ao retomar importação');
    } else {
      toast.success('Importação retomada!');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Aguardando</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processando</Badge>;
      case 'chunk_completed':
        return <Badge className="bg-yellow-500"><RefreshCw className="w-3 h-3 mr-1" /> Pausado</Badge>;
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluído</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Erro</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatFileSize = (mb: number) => {
    if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleBack = () => {
    if (onBack) onBack();
    if (onClose) onClose();
  };

  // Render based on phase
  if (phase === 'jobs') {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Histórico de Importações
              </CardTitle>
              <CardDescription>Jobs de importação anteriores</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPhase('select')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {jobs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma importação encontrada</p>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium truncate max-w-[300px]">{job.file_name}</span>
                      </div>
                      {getStatusBadge(job.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatFileSize(job.file_size_bytes / (1024 * 1024))}</span>
                      <span>{formatDate(job.created_at)}</span>
                      {job.processed_rows !== null && job.total_rows !== null && (
                        <span>{job.processed_rows.toLocaleString()} / {job.total_rows.toLocaleString()} linhas</span>
                      )}
                    </div>
                    {(job.status === 'chunk_completed' || job.status === 'failed') && (
                      <Button size="sm" variant="outline" onClick={() => resumeJob(job)}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retomar
                      </Button>
                    )}
                    {job.status === 'processing' && (
                      <Progress value={(job.processed_rows || 0) / Math.max(job.total_rows || 1, 1) * 100} className="h-2" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'uploading') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 animate-pulse" />
            Enviando para o Servidor
          </CardTitle>
          <CardDescription>Aguarde o upload do arquivo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
            <div className="flex-1">
              <p className="font-medium">{selectedFile?.name}</p>
              <p className="text-sm text-muted-foreground">
                {selectedFile && formatFileSize(selectedFile.size / (1024 * 1024))}
              </p>
            </div>
          </div>
          <Progress value={uploadProgress} className="h-3" />
          <p className="text-center text-sm text-muted-foreground">
            {uploadProgress < 100 ? 'Enviando arquivo...' : 'Upload concluído!'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'processing') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Processando no Servidor
          </CardTitle>
          <CardDescription>
            O arquivo está sendo processado. Você pode fechar esta página - o processamento continua.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentJob && (
            <>
              <div className="flex items-center justify-between">
                <span className="font-medium">{currentJob.file_name}</span>
                {getStatusBadge(currentJob.status)}
              </div>
              
              <Progress value={processingProgress} className="h-3" />
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {(currentJob.processed_rows || 0).toLocaleString()} / {(currentJob.total_rows || 0).toLocaleString()} linhas
                </span>
                <span>{processingProgress.toFixed(1)}%</span>
              </div>
              
              {isPolling && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Atualizando status...
                </div>
              )}
              
              {currentJob.error_log && Array.isArray(currentJob.error_log) && currentJob.error_log.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {currentJob.error_log.length} erro(s) encontrado(s)
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setPhase('select')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Nova Importação
            </Button>
            <Button variant="outline" onClick={() => { loadJobs(); setPhase('jobs'); }}>
              <History className="w-4 h-4 mr-2" />
              Ver Histórico
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'completed') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            Importação Concluída!
          </CardTitle>
          <CardDescription>Todos os dados foram processados com sucesso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentJob && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 space-y-2">
              <p className="font-medium">{currentJob.file_name}</p>
              <p className="text-sm">
                <span className="font-semibold">{(currentJob.processed_rows || 0).toLocaleString()}</span> linhas processadas
              </p>
              {currentJob.error_log && Array.isArray(currentJob.error_log) && currentJob.error_log.length > 0 && (
                <p className="text-sm text-yellow-600">
                  {currentJob.error_log.length} erro(s) durante o processamento
                </p>
              )}
            </div>
          )}
          
          <div className="flex gap-2">
            <Button onClick={resetState}>
              <Upload className="w-4 h-4 mr-2" />
              Nova Importação
            </Button>
            <Button variant="outline" onClick={() => { loadJobs(); setPhase('jobs'); }}>
              <History className="w-4 h-4 mr-2" />
              Ver Histórico
            </Button>
            <Button variant="ghost" onClick={handleBack}>
              Fechar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'error') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            Erro na Importação
          </CardTitle>
          <CardDescription>Ocorreu um problema durante o processamento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage || 'Erro desconhecido'}</AlertDescription>
          </Alert>
          
          <div className="flex gap-2">
            <Button onClick={resetState}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
            <Button variant="outline" onClick={() => { loadJobs(); setPhase('jobs'); }}>
              <History className="w-4 h-4 mr-2" />
              Ver Histórico
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Phase: select
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Motor de Importação 600MB+
            </CardTitle>
            <CardDescription>
              Processamento em camadas com Edge Functions - suporta arquivos grandes
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { loadJobs(); setPhase('jobs'); }}>
              <History className="w-4 h-4 mr-2" />
              Histórico
            </Button>
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            Como funciona:
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Upload direto para Supabase Storage (até 600MB)</li>
            <li>Processamento em background via Edge Functions</li>
            <li>Você pode fechar a página - o processo continua</li>
            <li>Retomada automática em caso de interrupção</li>
            <li>Suporta CSV (recomendado para arquivos grandes)</li>
          </ul>
        </div>
        
        <div 
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {selectedFile ? (
            <div className="space-y-2">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-primary" />
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(selectedFile.size / (1024 * 1024))}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="font-medium">Clique para selecionar arquivo</p>
              <p className="text-sm text-muted-foreground">CSV, XLSX ou XLS (até 600MB)</p>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={startImport} 
            disabled={!selectedFile}
            className="flex-1"
          >
            <Cloud className="w-4 h-4 mr-2" />
            Iniciar Importação
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BaseOffStorageImport;
