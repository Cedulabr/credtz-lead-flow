import { cn } from "@/lib/utils";

const COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
  "bg-pink-500", "bg-orange-500", "bg-fuchsia-500", "bg-lime-600",
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}

function initials(name: string): string {
  if (!name) return "?";
  const p = name.trim().split(/\s+/);
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  return p[0].substring(0, 2).toUpperCase();
}

interface Props {
  userId: string | null;
  userName?: string;
  currentUserId?: string;
  size?: "xs" | "sm";
  className?: string;
}

export function ResponsibleBadge({ userId, userName, currentUserId, size = "sm", className }: Props) {
  if (!userId) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border",
        className
      )}>
        🆓 Não atribuído
      </span>
    );
  }

  const isMe = currentUserId && userId === currentUserId;
  const name = userName || "Usuário";
  const color = COLORS[hashStr(userId) % COLORS.length];
  const dim = size === "xs" ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[10px]";

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 pr-2 py-0.5 rounded-full text-[11px] font-medium border max-w-full",
      isMe ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted/40 border-border text-foreground",
      className
    )}>
      <span className={cn(
        "rounded-full flex items-center justify-center text-white font-semibold shrink-0",
        color, dim
      )}>
        {initials(name)}
      </span>
      <span className="truncate">{isMe ? "Você" : name}</span>
    </span>
  );
}
