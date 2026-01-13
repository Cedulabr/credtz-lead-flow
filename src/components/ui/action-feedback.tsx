import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type FeedbackType = "success" | "error" | "loading" | "warning";

interface ActionFeedbackProps {
  type: FeedbackType;
  show: boolean;
  message?: string;
  className?: string;
  onComplete?: () => void;
  duration?: number;
}

const icons = {
  success: Check,
  error: X,
  loading: Loader2,
  warning: AlertCircle
};

const colors = {
  success: "bg-success text-success-foreground",
  error: "bg-destructive text-destructive-foreground",
  loading: "bg-primary text-primary-foreground",
  warning: "bg-warning text-warning-foreground"
};

export function ActionFeedback({ 
  type, 
  show, 
  message,
  className,
  onComplete,
  duration = 2000
}: ActionFeedbackProps) {
  const Icon = icons[type];

  React.useEffect(() => {
    if (show && type !== "loading" && onComplete) {
      const timer = setTimeout(onComplete, duration);
      return () => clearTimeout(timer);
    }
  }, [show, type, onComplete, duration]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
            className
          )}
        >
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 20 
            }}
            className={cn(
              "flex flex-col items-center gap-4 rounded-2xl p-8 shadow-xl",
              colors[type]
            )}
          >
            <motion.div
              initial={{ rotate: type === "loading" ? 0 : -90 }}
              animate={{ 
                rotate: type === "loading" ? 360 : 0,
              }}
              transition={
                type === "loading" 
                  ? { duration: 1, repeat: Infinity, ease: "linear" }
                  : { type: "spring", stiffness: 200 }
              }
            >
              <Icon className="h-12 w-12" strokeWidth={2.5} />
            </motion.div>
            {message && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg font-medium text-center max-w-xs"
              >
                {message}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface InlineActionFeedbackProps {
  type: FeedbackType;
  message?: string;
  className?: string;
}

export function InlineActionFeedback({ 
  type, 
  message,
  className
}: InlineActionFeedbackProps) {
  const Icon = icons[type];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className={cn(
        "flex items-center gap-2 text-sm font-medium",
        type === "success" && "text-success",
        type === "error" && "text-destructive",
        type === "warning" && "text-warning",
        type === "loading" && "text-muted-foreground",
        className
      )}
    >
      <Icon 
        className={cn(
          "h-4 w-4",
          type === "loading" && "animate-spin"
        )} 
      />
      {message && <span>{message}</span>}
    </motion.div>
  );
}

interface ButtonFeedbackProps {
  isLoading?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  defaultText: string;
  className?: string;
}

export function ButtonFeedbackContent({
  isLoading,
  isSuccess,
  isError,
  loadingText = "Salvando...",
  successText = "Salvo!",
  errorText = "Erro!",
  defaultText
}: ButtonFeedbackProps) {
  if (isLoading) {
    return (
      <motion.span
        key="loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex items-center gap-2"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {loadingText}
      </motion.span>
    );
  }

  if (isSuccess) {
    return (
      <motion.span
        key="success"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="flex items-center gap-2"
      >
        <Check className="h-4 w-4" />
        {successText}
      </motion.span>
    );
  }

  if (isError) {
    return (
      <motion.span
        key="error"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="flex items-center gap-2"
      >
        <X className="h-4 w-4" />
        {errorText}
      </motion.span>
    );
  }

  return (
    <motion.span
      key="default"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {defaultText}
    </motion.span>
  );
}

// Ripple effect hook for buttons
export function useRipple() {
  const [ripples, setRipples] = React.useState<{ x: number; y: number; id: number }[]>([]);

  const createRipple = (event: React.MouseEvent<HTMLElement>) => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  };

  const RippleContainer = () => (
    <>
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute rounded-full bg-white/30 pointer-events-none"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20
          }}
        />
      ))}
    </>
  );

  return { createRipple, RippleContainer };
}
