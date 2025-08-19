import { useState, useEffect } from 'react';
import { Database, Wifi, Shield, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const LoadingAuth = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showSkip, setShowSkip] = useState(false);

  const steps = [
    { icon: Wifi, label: 'Conectando ao servidor...', duration: 1500 },
    { icon: Shield, label: 'Verificando autenticação...', duration: 2000 },
    { icon: Database, label: 'Carregando dados do usuário...', duration: 1500 },
    { icon: CheckCircle, label: 'Finalizando...', duration: 1000 }
  ];

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    let totalTime = 0;

    steps.forEach((step, index) => {
      totalTime += step.duration;
      const timer = setTimeout(() => {
        setCurrentStep(index);
      }, totalTime - step.duration);
      timers.push(timer);
    });

    // Show skip button after 8 seconds
    const skipTimer = setTimeout(() => {
      setShowSkip(true);
    }, 8000);
    timers.push(skipTimer);

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, []);

  const handleSkip = () => {
    // Force navigation to proceed without waiting
    window.location.href = '/auth';
  };

  const currentStepData = steps[currentStep];
  const CurrentIcon = currentStepData?.icon || Database;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 border-0 shadow-2xl bg-card/80 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                  <Database className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute -inset-2 bg-primary/20 rounded-full animate-ping"></div>
              </div>
            </div>

            {/* Current Step */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <CurrentIcon className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <p className="text-lg font-medium text-foreground">
                {currentStepData?.label || 'Carregando autenticação...'}
              </p>
            </div>

            {/* Progress Steps */}
            <div className="flex justify-center space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index <= currentStep 
                      ? 'bg-primary scale-125' 
                      : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>

            {/* Skip Button */}
            {showSkip && (
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground mb-3">
                  A autenticação está demorando mais que o esperado
                </p>
                <Button 
                  onClick={handleSkip}
                  variant="outline"
                  className="w-full"
                >
                  Continuar para Login
                </Button>
              </div>
            )}

            {/* Loading indicator */}
            <div className="flex justify-center">
              <div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoadingAuth;