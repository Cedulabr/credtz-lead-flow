import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { 
  LayoutGrid, 
  List, 
  BarChart3, 
  Plus,
  CreditCard,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavBarProps {
  activeView: "pipeline" | "list" | "metrics";
  onViewChange: (view: "pipeline" | "list" | "metrics") => void;
  userCredits: number;
  onRequestLeads: (options: { count: number }) => Promise<boolean>;
}

export function MobileNavBar({ 
  activeView, 
  onViewChange,
  userCredits,
  onRequestLeads
}: MobileNavBarProps) {
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [requestCount, setRequestCount] = useState(10);
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequest = async () => {
    setIsRequesting(true);
    const success = await onRequestLeads({ count: requestCount });
    if (success) {
      setIsRequestOpen(false);
    }
    setIsRequesting(false);
  };

  const navItems = [
    { key: "pipeline" as const, icon: LayoutGrid, label: "Pipeline" },
    { key: "list" as const, icon: List, label: "Lista" },
    { key: "metrics" as const, icon: BarChart3, label: "Métricas" },
  ];

  return (
    <div className="sticky bottom-0 z-40 bg-background border-t safe-area-inset-bottom">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.key;
          
          return (
            <button
              key={item.key}
              onClick={() => onViewChange(item.key)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}

        {/* Request Leads Button */}
        <Sheet open={isRequestOpen} onOpenChange={setIsRequestOpen}>
          <SheetTrigger asChild>
            <button
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors relative"
            >
              <div className="relative">
                <Plus className="h-5 w-5" />
                {userCredits > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-3 h-4 min-w-4 px-1 text-[8px] bg-primary"
                  >
                    {userCredits}
                  </Badge>
                )}
              </div>
              <span className="text-[10px] font-medium">Solicitar</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Solicitar Leads
              </SheetTitle>
            </SheetHeader>
            <div className="py-6 space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div>
                  <p className="text-sm text-muted-foreground">Créditos disponíveis</p>
                  <p className="text-3xl font-bold text-primary">{userCredits}</p>
                </div>
                <CreditCard className="h-10 w-10 text-primary/40" />
              </div>

              <div className="space-y-3">
                <Label>Quantidade de leads</Label>
                <div className="flex items-center gap-3">
                  {[5, 10, 20, 50].map((num) => (
                    <Button
                      key={num}
                      variant={requestCount === num ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRequestCount(num)}
                      disabled={num > userCredits}
                      className="flex-1"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={requestCount}
                    onChange={(e) => setRequestCount(Math.min(Number(e.target.value), userCredits))}
                    min={1}
                    max={userCredits}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">leads</span>
                </div>
              </div>

              <Button 
                className="w-full h-12" 
                onClick={handleRequest}
                disabled={isRequesting || requestCount > userCredits || requestCount < 1}
              >
                {isRequesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Solicitando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Solicitar {requestCount} leads
                  </>
                )}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
