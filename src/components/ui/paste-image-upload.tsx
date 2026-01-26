import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Clipboard, Check, X, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface PasteImageUploadProps {
  /** Current file (controlled) */
  file: File | null;
  /** Preview URL (controlled) */
  preview: string | null;
  /** Called when a valid file is selected or pasted */
  onFileChange: (file: File | null, preview: string | null) => void;
  /** Called when there's a validation error */
  onError?: (message: string) => void;
  /** Whether the component is in loading state */
  isLoading?: boolean;
  /** Maximum file size in bytes (default: 5MB) */
  maxSizeBytes?: number;
  /** Accepted MIME types (default: image/jpeg, image/png) */
  acceptedTypes?: string[];
  /** Custom placeholder text */
  placeholderText?: string;
  /** Custom paste instruction text */
  pasteInstructionText?: string;
  /** Additional class names */
  className?: string;
  /** Disable interactions */
  disabled?: boolean;
}

/**
 * PasteImageUpload - A component that allows uploading images via:
 * - Traditional file selection (click or drag)
 * - Pasting from clipboard (Ctrl+V / Cmd+V)
 * 
 * Features:
 * - Real-time preview
 * - File validation (type and size)
 * - Remove/replace functionality
 * - Visual feedback for all states
 * - Mobile and desktop compatible
 */
export function PasteImageUpload({
  file,
  preview,
  onFileChange,
  onError,
  isLoading = false,
  maxSizeBytes = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"],
  placeholderText = "Clique ou arraste para anexar",
  pasteInstructionText = "Cole o print aqui (Ctrl + V)",
  className,
  disabled = false,
}: PasteImageUploadProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isPasteFocused, setIsPasteFocused] = React.useState(false);
  const [showPasteSuccess, setShowPasteSuccess] = React.useState(false);

  // Format file size for display
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Validate and process a file
  const processFile = React.useCallback((fileToProcess: File) => {
    // Validate file type
    if (!acceptedTypes.includes(fileToProcess.type)) {
      onError?.(`Formato inválido. Aceitos: ${acceptedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`);
      return false;
    }

    // Validate file size
    if (fileToProcess.size > maxSizeBytes) {
      onError?.(`Arquivo muito grande. Máximo: ${formatSize(maxSizeBytes)}`);
      return false;
    }

    // Create preview and call callback
    const reader = new FileReader();
    reader.onload = (e) => {
      onFileChange(fileToProcess, e.target?.result as string);
    };
    reader.readAsDataURL(fileToProcess);
    return true;
  }, [acceptedTypes, maxSizeBytes, onError, onFileChange]);

  // Handle paste event (Ctrl+V)
  const handlePaste = React.useCallback((event: ClipboardEvent) => {
    if (disabled || isLoading) return;

    const items = event.clipboardData?.items;
    if (!items) return;

    // Look for image in clipboard
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const blob = item.getAsFile();
        
        if (blob) {
          // Create a proper File object with name
          const fileName = `print_${Date.now()}.${item.type.split('/')[1]}`;
          const file = new File([blob], fileName, { type: item.type });
          
          if (processFile(file)) {
            setShowPasteSuccess(true);
            setTimeout(() => setShowPasteSuccess(false), 2000);
          }
        }
        return;
      }
    }
  }, [disabled, isLoading, processFile]);

  // Handle file input change (traditional upload)
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
    // Reset input to allow selecting same file again
    event.target.value = '';
  };

  // Handle drag and drop
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled && !isLoading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    if (disabled || isLoading) return;

    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  // Remove current file
  const handleRemove = (event: React.MouseEvent) => {
    event.stopPropagation();
    onFileChange(null, null);
  };

  // Open file dialog
  const handleClick = () => {
    if (!disabled && !isLoading) {
      inputRef.current?.click();
    }
  };

  // Register paste listener when component is focused or mounted
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add paste listener to window (works when user is focused on page)
    const handleWindowPaste = (e: ClipboardEvent) => {
      // Only process if container is visible
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        handlePaste(e);
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [handlePaste]);

  // Handle keyboard focus for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onFocus={() => setIsPasteFocused(true)}
      onBlur={() => setIsPasteFocused(false)}
      className={cn(
        "relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2",
        isDragOver && "border-primary bg-primary/5 scale-[1.02]",
        isPasteFocused && !isDragOver && "border-primary/60",
        disabled && "opacity-50 cursor-not-allowed",
        isLoading && "pointer-events-none",
        !preview && !isDragOver && "hover:border-primary/50 hover:bg-muted/30",
        preview && "border-solid border-success/50 bg-success/5",
        className
      )}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || isLoading}
        aria-label="Upload de arquivo"
      />

      <AnimatePresence mode="wait">
        {isLoading ? (
          // Loading state
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <p className="text-base text-muted-foreground">Enviando...</p>
          </motion.div>
        ) : preview ? (
          // Preview state
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="space-y-3"
          >
            <div className="relative inline-block">
              <img
                src={preview}
                alt="Preview do anexo"
                className="max-h-40 mx-auto rounded-lg shadow-lg border"
              />
              {/* Remove button */}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleRemove}
                className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-md"
                title="Remover imagem"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <Check className="h-4 w-4 text-success" />
              <p className="text-sm text-success font-medium">
                {file?.name || 'Print anexado com sucesso'}
              </p>
            </div>
            
            {file && (
              <p className="text-xs text-muted-foreground">
                {formatSize(file.size)} • Clique para substituir
              </p>
            )}
          </motion.div>
        ) : (
          // Empty state
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Icon */}
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300",
              isDragOver 
                ? "bg-gradient-to-r from-primary to-primary/70 text-primary-foreground scale-110" 
                : "bg-gradient-to-r from-primary/20 to-primary/10"
            )}>
              {isDragOver ? (
                <Upload className="h-8 w-8" />
              ) : (
                <Camera className="h-8 w-8 text-primary" />
              )}
            </div>

            {/* Paste instruction - prominent */}
            <div className={cn(
              "mb-3 py-2 px-4 rounded-lg inline-flex items-center gap-2 transition-all duration-300",
              isPasteFocused 
                ? "bg-primary/10 text-primary" 
                : "bg-muted/50 text-muted-foreground"
            )}>
              <Clipboard className="h-4 w-4" />
              <span className="text-sm font-medium">{pasteInstructionText}</span>
            </div>

            {/* Secondary instructions */}
            <p className="text-base text-muted-foreground">{placeholderText}</p>
            <p className="text-sm text-muted-foreground mt-2">
              📷 {acceptedTypes.map(t => t.split('/')[1].toUpperCase()).join(' ou ')} • Máximo {formatSize(maxSizeBytes)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paste success toast */}
      <AnimatePresence>
        {showPasteSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full z-10"
          >
            <div className="flex items-center gap-2 bg-success text-success-foreground px-4 py-2 rounded-full shadow-lg text-sm font-medium">
              <Check className="h-4 w-4" />
              Print colado com sucesso!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-primary/10 rounded-xl flex items-center justify-center backdrop-blur-[1px]"
          >
            <p className="text-primary font-semibold text-lg">
              📥 Solte a imagem aqui
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
