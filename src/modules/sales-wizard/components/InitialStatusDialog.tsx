import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { FileText, Play, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InitialStatusDialogProps {
  open: boolean;
  onSelect: (status: "solicitar_digitacao" | "em_andamento") => void;
  clientName: string;
}

const STATUS_OPTIONS = [
  {
    value: "solicitar_digitacao" as const,
    label: "Aguardando Digitação",
    description: "A proposta ainda precisa ser digitada no sistema do banco.",
    icon: FileText,
    emoji: "📝",
    color: "border-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40",
    selectedColor: "border-purple-500 bg-purple-100 dark:bg-purple-800/40 ring-2 ring-purple-400",
  },
  {
    value: "em_andamento" as const,
    label: "Em Andamento",
    description: "A proposta já foi digitada e está em andamento no banco.",
    icon: Play,
    emoji: "⏳",
    color: "border-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40",
    selectedColor: "border-blue-500 bg-blue-100 dark:bg-blue-800/40 ring-2 ring-blue-400",
  },
];

export function InitialStatusDialog({ open, onSelect, clientName }: InitialStatusDialogProps) {
  const [selected, setSelected] = useState<"solicitar_digitacao" | "em_andamento" | null>(null);

  const handleConfirm = () => {
    if (selected) onSelect(selected);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Status Inicial da Proposta
          </DialogTitle>
          <DialogDescription>
            Defina o status inicial da proposta de <span className="font-semibold">{clientName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {STATUS_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selected === option.value;
            return (
              <motion.button
                key={option.value}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(option.value)}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left",
                  isSelected ? option.selectedColor : option.color
                )}
              >
                <span className="text-2xl mt-0.5">{option.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                </div>
              </motion.button>
            );
          })}
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} disabled={!selected} className="w-full">
            Confirmar Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
