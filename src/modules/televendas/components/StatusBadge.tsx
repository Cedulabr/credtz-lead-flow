import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG } from "../types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
  showEmoji?: boolean;
  className?: string;
}

export const StatusBadge = ({ 
  status, 
  size = "md", 
  showEmoji = true,
  className 
}: StatusBadgeProps) => {
  const config = STATUS_CONFIG[status] || {
    label: status,
    shortLabel: status,
    emoji: "❓",
    color: "text-gray-600",
    bgColor: "bg-gray-500/10 border-gray-300",
  };

  const sizeClasses = {
    sm: "text-xs py-0.5 px-2",
    md: "text-sm py-1 px-3",
    lg: "text-base py-1.5 px-4",
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.bgColor,
        config.color,
        sizeClasses[size],
        "font-medium border whitespace-nowrap",
        className
      )}
    >
      {showEmoji && <span className="mr-1">{config.emoji}</span>}
      {size === "sm" ? config.shortLabel : config.label}
    </Badge>
  );
};
