import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calculator, Users, Filter, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileActionBarProps {
  userCredits: number;
  onRequestLeads: () => void;
  onOpenFilters: () => void;
  onOpenSimulations: () => void;
  activeFiltersCount: number;
  pendingSimulations: number;
}

export function MobileActionBar({
  userCredits,
  onRequestLeads,
  onOpenFilters,
  onOpenSimulations,
  activeFiltersCount,
  pendingSimulations
}: MobileActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg safe-area-inset-bottom">
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        {/* Credits Display */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 shrink-0">
          <CreditCard className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-primary">{userCredits}</span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          {/* Filters Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenFilters}
            className="relative h-10 px-3"
          >
            <Filter className="h-4 w-4" />
            {activeFiltersCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          {/* Simulations Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSimulations}
            className="relative h-10 px-3"
          >
            <Calculator className="h-4 w-4" />
            {pendingSimulations > 0 && (
              <Badge 
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]"
              >
                {pendingSimulations}
              </Badge>
            )}
          </Button>

          {/* Main Action - Request Leads */}
          <Button
            onClick={onRequestLeads}
            className="h-10 px-4 gap-2"
            disabled={userCredits <= 0}
          >
            <Plus className="h-4 w-4" />
            <span className="font-semibold">Pedir Leads</span>
          </Button>
        </div>
      </div>
    </div>
  );
}