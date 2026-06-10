import { useState, useEffect } from "react";
import { Search, ShieldAlert, CheckCircle2, User, Landmark, Banknote, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  value: string;
  onChange: (cpf: string) => void;
}

export function CPFSearchField({ value, onChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSearch = async () => {
    if (value.replace(/\D/g, '').length !== 11) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_cpf_availability', {
        cpf_to_check: value.replace(/\D/g, '')
      });
      if (error) throw error;
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Buscar por CPF..."
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setResult(null);
            }}
            className="pr-10"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Button 
          type="button" 
          onClick={handleSearch} 
          disabled={loading || value.replace(/\D/g, '').length !== 11}
          size="sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar"}
        </Button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-lg border bg-muted/50 text-sm space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result.available ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                )}
                <span className="font-semibold">
                  {result.available ? "Disponível para pedido" : "Indisponível"}
                </span>
              </div>
              {!result.available && (
                <Badge variant="destructive" className="text-[10px]">
                  {result.already_leads ? "Já solicitado" : result.in_blacklist ? "Blacklist" : "Não encontrado"}
                </Badge>
              )}
            </div>

            {result.in_database && (
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-muted-foreground/10">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span className="truncate">{result.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Landmark className="h-3 w-3" />
                  <span className="truncate">{result.banco || "Não informado"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Banknote className="h-3 w-3" />
                  <span>Margem: R$ {result.margem?.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Badge variant="outline" className="h-4 px-1 text-[9px]">{result.convenio}</Badge>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
