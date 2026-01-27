import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, FileText, Calendar, Database } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DuplicateImportInfo } from "@/lib/fileHash";

interface DuplicateFileAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  duplicateInfo: DuplicateImportInfo | null;
  currentFileName?: string;
}

export function DuplicateFileAlert({
  isOpen,
  onClose,
  onConfirm,
  duplicateInfo,
  currentFileName
}: DuplicateFileAlertProps) {
  if (!duplicateInfo) return null;

  const formattedDate = duplicateInfo.originalImportDate
    ? format(duplicateInfo.originalImportDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : "Data desconhecida";

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle className="text-xl">Arquivo Já Importado</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <p className="text-muted-foreground">
                Este arquivo foi importado anteriormente. Deseja importar novamente?
              </p>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Arquivo:</span>
                  <span className="text-muted-foreground truncate max-w-[200px]">
                    {duplicateInfo.originalFileName || currentFileName || "Desconhecido"}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Importado em:</span>
                  <span className="text-muted-foreground">{formattedDate}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Registros:</span>
                  <span className="text-muted-foreground">
                    {duplicateInfo.recordsImported.toLocaleString('pt-BR')} registros processados
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                ⚠️ Importar o mesmo arquivo pode gerar registros duplicados no sistema.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Importar Mesmo Assim
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
