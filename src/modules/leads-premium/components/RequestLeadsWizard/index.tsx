import { useState, useCallback, useMemo, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { LeadRequestData, INITIAL_DATA, tipoLeadToConvenio } from "./types";
import { StepTipoLead } from "./StepTipoLead";
import { StepPerfil } from "./StepPerfil";
import { StepQuantidade } from "./StepQuantidade";
import { StepResumo } from "./StepResumo";
import { StepConfirmacao } from "./StepConfirmacao";

interface RequestLeadsWizardProps {
  isOpen: boolean;
  onClose: () => void;
  userCredits: number;
  onRequestLeads: (options: {
    convenio?: string;
    count: number;
    ddds?: string[];
    tags?: string[];
    banco?: string | null;
    parcelaMin?: number | null;
    parcelaMax?: number | null;
    margemMin?: number | null;
    parcelasPagasMin?: number | null;
    requireTelefone?: boolean | null;
  }) => Promise<boolean>;
}

const STEPS = [
  { id: 'convenio', title: 'Convênio' },
  { id: 'perfil', title: 'Perfil' },
  { id: 'quantidade', title: 'Quantidade' },
  { id: 'resumo', title: 'Resumo' },
  { id: 'confirmar', title: 'Confirmar' },
];

export function RequestLeadsWizard({
  isOpen,
  onClose,
  userCredits,
  onRequestLeads
}: RequestLeadsWizardProps) {
  const isMobile = useIsMobile();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<LeadRequestData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [direction, setDirection] = useState(1);

  // Hook do StepPerfil para validar antes de avançar
  const perfilCanAdvanceRef = useRef<(() => Promise<boolean>) | null>(null);

  const handleUpdate = useCallback((updates: Partial<LeadRequestData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleNext = useCallback(async () => {
    if (currentStep === 1 && perfilCanAdvanceRef.current) {
      setIsAdvancing(true);
      try {
        const ok = await perfilCanAdvanceRef.current();
        if (!ok) return;
      } finally {
        setIsAdvancing(false);
      }
    }
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleGoToStep = useCallback((step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    if (data.quantidade > userCredits) return;
    setIsSubmitting(true);
    try {
      const success = await onRequestLeads({
        convenio: tipoLeadToConvenio(data.tipoLead) || undefined,
        count: data.quantidade,
        ddds: data.ddds.length > 0 ? data.ddds : undefined,
        tags: data.tags.length > 0 ? data.tags : undefined,
        banco: data.banco,
        parcelaMin: data.parcelaMin,
        parcelaMax: data.parcelaMax,
        margemMin: data.margemMin,
        parcelasPagasMin: data.parcelasPagasMin,
        requireTelefone: data.requireTelefone,
      });
      if (success) {
        setData(INITIAL_DATA);
        setCurrentStep(0);
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [data, userCredits, onRequestLeads, onClose]);

  const handleClose = useCallback(() => {
    setData(INITIAL_DATA);
    setCurrentStep(0);
    onClose();
  }, [onClose]);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0: return !!data.tipoLead;
      case 1: return true; // validação real ocorre em handleNext via registerCanAdvance
      case 2: return data.quantidade > 0 && data.quantidade <= userCredits;
      case 3: return data.quantidade <= userCredits;
      case 4: return data.quantidade <= userCredits;
      default: return true;
    }
  }, [currentStep, data, userCredits]);

  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const stepVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 30 : -30, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -30 : 30, opacity: 0 }),
  };

  const Body = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* HEADER */}
      <header className="flex-shrink-0 px-5 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">Pedir Novos Leads</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleClose}
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      {/* STEP INDICATOR */}
      <div className="flex-shrink-0 px-5 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  onClick={() => index <= currentStep && handleGoToStep(index)}
                  disabled={index > currentStep}
                  className="flex flex-col items-center gap-1 disabled:cursor-not-allowed"
                >
                  <motion.div
                    className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all border-2",
                      isCompleted && "bg-primary border-primary text-primary-foreground",
                      isCurrent && "bg-primary/10 border-primary text-primary",
                      !isCompleted && !isCurrent && "bg-background border-muted text-muted-foreground"
                    )}
                    animate={isCurrent ? { scale: [1, 1.08, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </motion.div>
                  <span className={cn(
                    "text-[10px] font-medium hidden sm:block",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </span>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    "h-0.5 flex-1 mx-1.5",
                    index < currentStep ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>
        {/* Mobile current step label */}
        <p className="sm:hidden text-center text-xs font-medium text-primary mt-2">
          Etapa {currentStep + 1} de {STEPS.length}: {STEPS[currentStep].title}
        </p>
      </div>

      {/* CONTENT (scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {currentStep === 0 && (
              <StepTipoLead data={data} onUpdate={handleUpdate} />
            )}
            {currentStep === 1 && (
              <StepPerfil
                data={data}
                onUpdate={handleUpdate}
                registerCanAdvance={(fn) => { perfilCanAdvanceRef.current = fn; }}
              />
            )}
            {currentStep === 2 && (
              <StepQuantidade data={data} onUpdate={handleUpdate} userCredits={userCredits} />
            )}
            {currentStep === 3 && (
              <StepResumo
                data={data}
                onUpdate={handleUpdate}
                onGoToStep={handleGoToStep}
                userCredits={userCredits}
              />
            )}
            {currentStep === 4 && (
              <StepConfirmacao data={data} userCredits={userCredits} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* FOOTER (always pinned) */}
      <footer className="flex-shrink-0 px-5 py-3 border-t bg-background flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={isFirstStep || isSubmitting || isAdvancing}
          className="flex-1"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <Button
          type="button"
          onClick={isLastStep ? handleSubmit : handleNext}
          disabled={!canProceed || isSubmitting || isAdvancing}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : isAdvancing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : isLastStep ? (
            <>
              <Sparkles className="h-4 w-4 mr-1" />
              Gerar {data.quantidade} Leads
            </>
          ) : (
            <>
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </footer>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(o) => !o && handleClose()}>
        <SheetContent side="bottom" className="h-[92vh] p-0 gap-0 [&>button]:hidden">
          {Body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-[520px] h-[90vh] p-0 gap-0 [&>button]:hidden">
        {Body}
      </DialogContent>
    </Dialog>
  );
}
