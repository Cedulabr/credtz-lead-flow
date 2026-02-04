import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

import { LeadRequestData, INITIAL_DATA } from "./types";
import { StepTipoLead } from "./StepTipoLead";
import { StepPerfil } from "./StepPerfil";
import { StepQuantidade } from "./StepQuantidade";
import { StepResumo } from "./StepResumo";

interface RequestLeadsWizardProps {
  isOpen: boolean;
  onClose: () => void;
  userCredits: number;
  onRequestLeads: (options: {
    convenio?: string;
    count: number;
    ddds?: string[];
    tags?: string[];
  }) => Promise<boolean>;
}

const STEPS = [
  { id: 'tipo', title: 'Tipo', icon: '📋' },
  { id: 'perfil', title: 'Perfil', icon: '👤' },
  { id: 'quantidade', title: 'Quantidade', icon: '🔢' },
  { id: 'resumo', title: 'Confirmar', icon: '✅' },
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
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  const handleUpdate = useCallback((updates: Partial<LeadRequestData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleNext = useCallback(() => {
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
        convenio: data.convenio || undefined,
        count: data.quantidade,
        ddds: data.ddds.length > 0 ? data.ddds : undefined,
        tags: data.tags.length > 0 ? data.tags : undefined,
      });

      if (success) {
        // Reset and close
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
      case 1: return true; // Perfil é opcional
      case 2: return data.quantidade > 0 && data.quantidade <= userCredits;
      case 3: return data.quantidade <= userCredits;
      default: return true;
    }
  }, [currentStep, data, userCredits]);

  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -50 : 50,
      opacity: 0
    })
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Step Indicator */}
      <div className="flex-shrink-0 px-1 py-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => index <= currentStep && handleGoToStep(index)}
                  disabled={index > currentStep}
                  className="flex flex-col items-center gap-1"
                >
                  <motion.div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center text-lg transition-all",
                      isCompleted && "bg-primary text-primary-foreground",
                      isCurrent && "bg-primary/20 ring-2 ring-primary ring-offset-2 ring-offset-background",
                      !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                    )}
                    animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : step.icon}
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
                    "h-0.5 w-6 sm:w-10 mx-1",
                    index < currentStep ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Step Title */}
        <div className="sm:hidden text-center mt-3">
          <p className="text-sm font-medium text-primary">
            Etapa {currentStep + 1}: {STEPS[currentStep].title}
          </p>
        </div>
      </div>

      {/* Step Content */}
      <ScrollArea className="flex-1 px-1">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="pb-4"
          >
            {currentStep === 0 && (
              <StepTipoLead data={data} onUpdate={handleUpdate} />
            )}
            {currentStep === 1 && (
              <StepPerfil data={data} onUpdate={handleUpdate} />
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
          </motion.div>
        </AnimatePresence>
      </ScrollArea>

      {/* Navigation */}
      <div className="flex-shrink-0 pt-4 border-t flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={isFirstStep || isSubmitting}
          className="flex-1"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <Button
          type="button"
          onClick={isLastStep ? handleSubmit : handleNext}
          disabled={!canProceed || isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando...
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
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="h-[92vh] flex flex-col p-4">
          <SheetHeader className="flex-shrink-0 pb-2">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Pedir Novos Leads
            </SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Pedir Novos Leads
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
