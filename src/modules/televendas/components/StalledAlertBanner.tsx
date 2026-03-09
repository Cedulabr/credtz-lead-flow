import { motion } from "framer-motion";
import { AlertTriangle, AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StalledAlertBannerProps {
  criticos: number;
  alertas: number;
  onFilterByPriority: (priority: string) => void;
}

export const StalledAlertBanner = ({ criticos, alertas, onFilterByPriority }: StalledAlertBannerProps) => {
  if (criticos === 0 && alertas === 0) return null;

  return (
    <div className="space-y-2">
      {criticos > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl border-2 border-red-500 bg-red-50 dark:bg-red-950/40 p-4 shadow-lg animate-pulse"
          style={{
            boxShadow: "0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.2)",
          }}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-500 text-white shrink-0">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div>
                <p className="text-lg font-bold text-red-800 dark:text-red-300">
                  🔴 {criticos} proposta{criticos !== 1 ? "s" : ""} em estado CRÍTICO!
                </p>
                <p className="text-sm text-red-700 dark:text-red-400">
                  Paradas há mais de 10 dias sem atualização. Ação imediata necessária.
                </p>
              </div>
            </div>
            <Button
              onClick={() => onFilterByPriority("critico")}
              className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2 shadow-lg"
              size="lg"
            >
              <Eye className="h-5 w-5" />
              Ver propostas críticas
            </Button>
          </div>
        </motion.div>
      )}

      {alertas > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 shadow-md"
          style={{
            boxShadow: criticos === 0 ? "0 0 15px rgba(245, 158, 11, 0.3)" : undefined,
          }}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-amber-500 text-white shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-bold text-amber-800 dark:text-amber-300">
                  🟡 {alertas} proposta{alertas !== 1 ? "s" : ""} em alerta
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Paradas há mais de 5 dias. Verifique o andamento.
                </p>
              </div>
            </div>
            <Button
              onClick={() => onFilterByPriority("alerta")}
              variant="outline"
              className="border-amber-500 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 font-semibold gap-2"
            >
              <Eye className="h-4 w-4" />
              Ver propostas
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
