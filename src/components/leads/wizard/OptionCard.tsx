import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface OptionCardProps {
  icon: string;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

export function OptionCard({ icon, title, description, selected, onClick }: OptionCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer p-5 transition-all hover:shadow-md flex items-start gap-4 border-2",
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      )}
    >
      <div className="text-3xl leading-none">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-base">{title}</h3>
          {selected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </Card>
  );
}
