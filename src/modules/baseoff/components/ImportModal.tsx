import React, { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  BarChart2, 
  RefreshCw,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { ImportType, IMPORT_TYPE_CONFIG, ImportJob } from '../types';
import { formatFileSize } from '../utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: (jobId: string) => void;
}

type UploadPhase = 'select' | 'uploading' | 'processing' | 'done' | 'error';

export function ImportModal({ isOpen, onClose, onJobCreated }: ImportModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [importType, setImportType] = useState<ImportType>('contratos');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>('select');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setPhase('select');
    setUploadProgress(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = file.name.toLowerCase().split('.').pop();
    if (!['csv', 'xlsx', 'xls'].includes(extension || '')) {
      setError('Formato inválido. Use CSV, XLSX ou XLS.');
      return;
    }

    // 900MB limit for large file support
    if (file.size > 900 * 1024 * 1024) {
      setError('Arquivo muito grande. Limite: 900MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setPhase('uploading');
    setUploadProgress(0);
    setError(null);

    try {
      // 1. Generate unique file path
      const timestamp = Date.now();
      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `imports/${user.id}/${timestamp}_${safeName}`;

      // 2. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('import-files')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      setUploadProgress(50);

      // 3. Create import job record
      const { data: job, error: jobError } = await supabase
        .from('import_jobs')
        .insert({
          user_id: user.id,
          file_name: selectedFile.name,
          file_path: filePath,
          file_size_bytes: selectedFile.size,
          module: `baseoff_${importType}`,
          status: 'uploaded',
          metadata: { import_type: importType },
        })
        .select()
        .single();

      if (jobError) {
        throw new Error(`Erro ao criar job: ${jobError.message}`);
      }

      setUploadProgress(75);
      setPhase('processing');

      // 4. Trigger Edge Function to start processing
      const { error: processError } = await supabase.functions.invoke('process-import', {
        body: { job_id: job.id }
      });

      if (processError) {
        console.warn('Aviso ao iniciar processamento:', processError);
        // Don't throw - the job is created and can be retried
      }

      setUploadProgress(100);
      setPhase('done');
      
      toast.success('Importação iniciada! Acompanhe o progresso.');
      onJobCreated(job.id);
      
      // Auto-close after short delay
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Erro ao iniciar importação');
      setPhase('error');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importar Base Off
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Import Type Selection */}
          <div className="space-y-3">
            <Label className="text-base">Tipo da Base</Label>
            <RadioGroup
              value={importType}
              onValueChange={(value) => setImportType(value as ImportType)}
              className="grid grid-cols-3 gap-3"
              disabled={phase !== 'select'}
            >
              {Object.entries(IMPORT_TYPE_CONFIG).map(([key, config]) => (
                <Label
                  key={key}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 border-2 rounded-xl cursor-pointer transition-all',
                    importType === key 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value={key} className="sr-only" />
                  <span className="text-2xl">{config.emoji}</span>
                  <span className="text-sm font-medium">{config.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* File Selection */}
          {phase === 'select' && (
            <div className="space-y-3">
              <Label className="text-base">Arquivo</Label>
              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                  selectedFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                )}
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
                    <FileText className="w-10 h-10 mx-auto text-primary" />
                    <p className="font-medium truncate">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">Clique ou arraste o arquivo</p>
                    <p className="text-xs text-muted-foreground">CSV, XLSX ou XLS (até 900MB)</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {(phase === 'uploading' || phase === 'processing') && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="font-medium">
                  {phase === 'uploading' ? 'Enviando arquivo...' : 'Iniciando processamento...'}
                </span>
              </div>
              <Progress value={uploadProgress} className="h-3" />
              <p className="text-sm text-muted-foreground text-center">{uploadProgress}%</p>
            </div>
          )}

          {/* Success */}
          {phase === 'done' && (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
              <p className="font-medium text-lg">Importação iniciada!</p>
              <p className="text-sm text-muted-foreground">Acompanhe o progresso na tela principal.</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {phase === 'select' && (
              <>
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={!selectedFile}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importar
                </Button>
              </>
            )}
            {phase === 'error' && (
              <Button onClick={resetState} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
