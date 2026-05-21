import { Button } from "@/components/ui/button";
import { STATUS_LABELS, STATUS_ORDER, AgibankLeadStatus } from "../types";

interface Props {
  active: AgibankLeadStatus | "todos";
  onChange: (v: AgibankLeadStatus | "todos") => void;
  counts: Partial<Record<AgibankLeadStatus | "todos", number>>;
}

export function FilterTabs({ active, onChange, counts }: Props) {
  const items: Array<AgibankLeadStatus | "todos"> = ["todos", ...STATUS_ORDER];
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {items.map(key => {
        const label = key === "todos" ? "Todos" : STATUS_LABELS[key];
        return (
          <Button
            key={key}
            variant={active === key ? "default" : "outline"}
            size="sm"
            className="rounded-full shrink-0"
            onClick={() => onChange(key)}
          >
            {label}
            {counts[key] != null && (
              <span className="ml-2 text-xs opacity-70">{counts[key]}</span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
