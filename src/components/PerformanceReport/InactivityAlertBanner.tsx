import { AlertTriangle } from "lucide-react";
import { UserPerformance } from "./types";

interface InactivityAlertBannerProps {
  data: UserPerformance[];
}

export function InactivityAlertBanner({ data }: InactivityAlertBannerProps) {
  const criticalUsers = data.filter((u) => u.activityStatus === "critical");
  const warningUsers = data.filter((u) => u.activityStatus === "warning");

  if (criticalUsers.length === 0 && warningUsers.length === 0) return null;

  return (
    <div className="space-y-2">
      {criticalUsers.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">
              {criticalUsers.length} colaborador{criticalUsers.length > 1 ? "es" : ""} sem atividade há mais de 7 dias
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
              {criticalUsers.map((u) => u.userName).join(", ")}
            </p>
          </div>
        </div>
      )}
      {warningUsers.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {warningUsers.length} colaborador{warningUsers.length > 1 ? "es" : ""} com atividade reduzida (3-6 dias)
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {warningUsers.map((u) => u.userName).join(", ")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
