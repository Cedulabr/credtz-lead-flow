import { RefreshCw } from "lucide-react";

interface SyncIndicatorProps {
  lastSyncAt?: string | null;
  size?: "sm" | "md";
}

const getSyncStatus = (lastSyncAt?: string | null) => {
  if (!lastSyncAt) return { color: "text-red-500", bg: "bg-red-500", label: "Nunca verificado", level: "stale" };
  
  const diffMs = Date.now() - new Date(lastSyncAt).getTime();
  const diffMins = diffMs / 60000;
  
  if (diffMins < 30) return { color: "text-green-500", bg: "bg-green-500", label: `há ${Math.floor(diffMins)}min`, level: "fresh" };
  if (diffMins < 120) return { color: "text-yellow-500", bg: "bg-yellow-500", label: `há ${Math.floor(diffMins)}min`, level: "medium" };
  if (diffMins < 1440) return { color: "text-orange-500", bg: "bg-orange-500", label: `há ${Math.floor(diffMins / 60)}h`, level: "old" };
  return { color: "text-red-500", bg: "bg-red-500", label: `há ${Math.floor(diffMins / 1440)}d`, level: "stale" };
};

export const SyncIndicator = ({ lastSyncAt, size = "sm" }: SyncIndicatorProps) => {
  const status = getSyncStatus(lastSyncAt);
  
  if (size === "sm") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${status.bg}`} />
        {status.label}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`inline-block h-2 w-2 rounded-full ${status.bg}`} />
      <RefreshCw className="h-3 w-3" />
      <span>Última verificação: {status.label}</span>
    </div>
  );
};

export { getSyncStatus };
