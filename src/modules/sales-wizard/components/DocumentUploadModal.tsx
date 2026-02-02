import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, CheckCircle2, X, Loader2, FileUp, CreditCard, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DocumentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientCpf: string;
  onComplete?: () => void;
}

interface FileUpload {
  file: File | null;
  uploading: boolean;
  uploaded: boolean;
}

export function DocumentUploadModal({
  open,
  onOpenChange,
  clientName,
  clientCpf,
  onComplete,
}: DocumentUploadModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [rgFrente, setRgFrente] = useState<FileUpload>({ file: null, uploading: false, uploaded: false });
  const [rgVerso, setRgVerso] = useState<FileUpload>({ file: null, uploading: false, uploaded: false });
  const [extrato, setExtrato] = useState<FileUpload>({ file: null, uploading: false, uploaded: false });
  const [isUploading, setIsUploading] = useState(false);

  const hasAnyFile = rgFrente.file || rgVerso.file || extrato.file;
  const allUploaded = 
    (!rgFrente.file || rgFrente.uploaded) && 
    (!rgVerso.file || rgVerso.uploaded) && 
    (!extrato.file || extrato.uploaded);

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<FileUpload>>
  ) => {
    const file = e.target.files?.[0] || null;
    setter({ file, uploading: false, uploaded: false });
  };

  const uploadFile = async (file: File, documentType: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const cleanCpf = clientCpf.replace(/\D/g, "");
    const fileName = `${user?.id}/${cleanCpf}/${documentType}_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("client-documents")
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from("client-documents")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const saveDocument = async (fileUrl: string, documentType: string, fileName: string) => {
    const cleanCpf = clientCpf.replace(/\D/g, "");
    
    const { error } = await supabase.from("client_documents").insert({
      client_cpf: cleanCpf,
      client_name: clientName,
      document_type: documentType,
      file_url: fileUrl,
      file_name: fileName,
      uploaded_by: user?.id,
      origin: "televendas",
    });

    if (error) throw error;
  };

  const handleUploadAll = async () => {
    if (!hasAnyFile) {
      onOpenChange(false);
      onComplete?.();
      return;
    }

    setIsUploading(true);

    try {
      // Upload RG Frente
      if (rgFrente.file && !rgFrente.uploaded) {
        setRgFrente(prev => ({ ...prev, uploading: true }));
        const url = await uploadFile(rgFrente.file, "rg_frente");
        if (url) {
          await saveDocument(url, "rg_frente", rgFrente.file.name);
          setRgFrente(prev => ({ ...prev, uploading: false, uploaded: true }));
        }
      }

      // Upload RG Verso
      if (rgVerso.file && !rgVerso.uploaded) {
        setRgVerso(prev => ({ ...prev, uploading: true }));
        const url = await uploadFile(rgVerso.file, "rg_verso");
        if (url) {
          await saveDocument(url, "rg_verso", rgVerso.file.name);
          setRgVerso(prev => ({ ...prev, uploading: false, uploaded: true }));
        }
      }

      // Upload Extrato
      if (extrato.file && !extrato.uploaded) {
        setExtrato(prev => ({ ...prev, uploading: true }));
        const url = await uploadFile(extrato.file, "extrato_emprestimo");
        if (url) {
          await saveDocument(url, "extrato_emprestimo", extrato.file.name);
          setExtrato(prev => ({ ...prev, uploading: false, uploaded: true }));
        }
      }

      toast({
        title: "📁 Documentos enviados!",
        description: "Os documentos foram anexados à proposta.",
      });

      setTimeout(() => {
        onOpenChange(false);
        onComplete?.();
      }, 1500);

    } catch (error) {
      console.error("Error uploading documents:", error);
      toast({
        title: "Erro no upload",
        description: "Falha ao enviar um ou mais documentos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    onComplete?.();
  };

  const FileUploadCard = ({
    label,
    icon: Icon,
    state,
    setter,
    inputId,
  }: {
    label: string;
    icon: React.ElementType;
    state: FileUpload;
    setter: React.Dispatch<React.SetStateAction<FileUpload>>;
    inputId: string;
  }) => (
    <div className="relative">
      <input
        type="file"
        id={inputId}
        accept="image/*,.pdf"
        onChange={(e) => handleFileSelect(e, setter)}
        className="hidden"
        disabled={isUploading || state.uploaded}
      />
      <label
        htmlFor={inputId}
        className={`
          flex items-center gap-4 p-4 rounded-xl border-2 border-dashed cursor-pointer
          transition-all duration-200
          ${state.uploaded 
            ? "border-emerald-500 bg-emerald-500/10 dark:border-emerald-400 dark:bg-emerald-400/10" 
            : state.file 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50"
          }
          ${(isUploading || state.uploaded) ? "cursor-not-allowed opacity-75" : ""}
        `}
      >
        <div className={`
          p-3 rounded-xl 
          ${state.uploaded ? "bg-emerald-500/20 dark:bg-emerald-400/20" : state.file ? "bg-primary/20" : "bg-muted"}
        `}>
          {state.uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : state.uploaded ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
          ) : (
            <Icon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground truncate">
            {state.uploaded 
              ? "✅ Enviado com sucesso" 
              : state.file 
                ? state.file.name 
                : "Clique para selecionar (opcional)"
            }
          </p>
        </div>

        {state.file && !state.uploaded && !state.uploading && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.preventDefault();
              setter({ file: null, uploading: false, uploaded: false });
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </label>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary" />
            Anexar Documentação
          </DialogTitle>
          <DialogDescription>
            Deseja anexar documentos do cliente <strong>{clientName}</strong>?
            <br />
            <span className="text-xs">Todos os campos são opcionais.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <FileUploadCard
            label="RG (Frente)"
            icon={User}
            state={rgFrente}
            setter={setRgFrente}
            inputId="rg-frente-upload"
          />
          
          <FileUploadCard
            label="RG (Verso)"
            icon={User}
            state={rgVerso}
            setter={setRgVerso}
            inputId="rg-verso-upload"
          />
          
          <FileUploadCard
            label="Extrato Consignado"
            icon={CreditCard}
            state={extrato}
            setter={setExtrato}
            inputId="extrato-upload"
          />
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isUploading}
            className="w-full sm:w-auto"
          >
            Pular
          </Button>
          
          <Button
            onClick={handleUploadAll}
            disabled={isUploading}
            className="w-full sm:w-auto gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : hasAnyFile ? (
              <>
                <Upload className="h-4 w-4" />
                Enviar Documentos
              </>
            ) : (
              "Concluir"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
