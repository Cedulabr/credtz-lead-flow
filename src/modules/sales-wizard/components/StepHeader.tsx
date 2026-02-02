import { cn } from "@/lib/utils";

interface StepHeaderProps {
  title: string;
  subtitle: string;
  stepNumber: number;
  icon?: React.ReactNode;
  className?: string;
}

export function StepHeader({ title, subtitle, stepNumber, icon, className }: StepHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
          {stepNumber}
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <p className="text-muted-foreground ml-11">{subtitle}</p>
    </div>
  );
}
