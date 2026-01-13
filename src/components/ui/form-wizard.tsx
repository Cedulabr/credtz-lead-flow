import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  title: string;
  description?: string;
  icon?: React.ElementType;
}

interface FormWizardProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
  children: React.ReactNode[];
  onComplete?: () => void;
  isSubmitting?: boolean;
  canProceed?: boolean;
  className?: string;
  showNavigation?: boolean;
  completeText?: string;
}

export function FormWizard({
  steps,
  currentStep,
  onStepChange,
  children,
  onComplete,
  isSubmitting = false,
  canProceed = true,
  className,
  showNavigation = true,
  completeText = "Finalizar"
}: FormWizardProps) {
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete?.();
    } else {
      onStepChange(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      onStepChange(currentStep - 1);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Step Indicator */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <button
                key={step.id}
                onClick={() => index <= currentStep && onStepChange(index)}
                disabled={index > currentStep}
                className="flex flex-col items-center"
              >
                <motion.div
                  className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary bg-background text-primary",
                    !isCompleted && !isCurrent && "border-muted bg-background text-muted-foreground"
                  )}
                  whileTap={{ scale: 0.95 }}
                  animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : Icon ? (
                    <Icon className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}
                </motion.div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium hidden sm:block max-w-[80px] text-center",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Step Title */}
      <div className="sm:hidden text-center">
        <h3 className="font-semibold text-lg">{steps[currentStep].title}</h3>
        {steps[currentStep].description && (
          <p className="text-sm text-muted-foreground mt-1">
            {steps[currentStep].description}
          </p>
        )}
      </div>

      {/* Step Content */}
      <div className="min-h-[200px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {children[currentStep]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      {showNavigation && (
        <div className="flex justify-between gap-4 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={isFirstStep || isSubmitting}
            className="flex-1 sm:flex-none"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={!canProceed || isSubmitting}
            className="flex-1 sm:flex-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : isLastStep ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                {completeText}
              </>
            ) : (
              <>
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

interface StepContentProps {
  children: React.ReactNode;
  className?: string;
}

export function StepContent({ children, className }: StepContentProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {children}
    </div>
  );
}

// Compact step indicator for mobile
interface CompactStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function CompactStepIndicator({ 
  currentStep, 
  totalSteps,
  className 
}: CompactStepIndicatorProps) {
  return (
    <div className={cn("flex items-center justify-center gap-1.5", className)}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <motion.div
          key={index}
          className={cn(
            "h-2 rounded-full transition-all",
            index === currentStep 
              ? "w-6 bg-primary" 
              : index < currentStep
                ? "w-2 bg-primary/60"
                : "w-2 bg-muted"
          )}
          animate={index === currentStep ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
        />
      ))}
    </div>
  );
}
