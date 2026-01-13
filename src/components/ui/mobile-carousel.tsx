import * as React from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

interface MobileCarouselProps {
  children: React.ReactNode[];
  className?: string;
  showDots?: boolean;
  showArrows?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  gap?: number;
}

export function MobileCarousel({
  children,
  className,
  showDots = true,
  showArrows = false,
  autoPlay = false,
  autoPlayInterval = 5000,
  gap = 16
}: MobileCarouselProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

  const itemCount = React.Children.count(children);

  // Auto play
  React.useEffect(() => {
    if (!autoPlay) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % itemCount);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, itemCount]);

  // Animate to current index
  React.useEffect(() => {
    if (!containerRef.current) return;
    const itemWidth = containerRef.current.offsetWidth;
    animate(x, -currentIndex * (itemWidth + gap), {
      type: "spring",
      stiffness: 300,
      damping: 30
    });
  }, [currentIndex, gap]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (info.offset.x < -threshold && currentIndex < itemCount - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Snap back
      if (containerRef.current) {
        const itemWidth = containerRef.current.offsetWidth;
        animate(x, -currentIndex * (itemWidth + gap));
      }
    }
  };

  const goTo = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, itemCount - 1)));
  };

  const goNext = () => goTo(currentIndex + 1);
  const goPrev = () => goTo(currentIndex - 1);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Carousel Container */}
      <motion.div
        ref={containerRef}
        className="flex cursor-grab active:cursor-grabbing"
        style={{ x, gap }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
      >
        {React.Children.map(children, (child, index) => (
          <motion.div
            key={index}
            className="flex-shrink-0 w-full"
            animate={{
              scale: index === currentIndex ? 1 : 0.95,
              opacity: index === currentIndex ? 1 : 0.7
            }}
            transition={{ duration: 0.2 }}
          >
            {child}
          </motion.div>
        ))}
      </motion.div>

      {/* Arrows */}
      {showArrows && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-md"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goNext}
            disabled={currentIndex === itemCount - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-md"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* Dots */}
      {showDots && itemCount > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: itemCount }).map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === currentIndex
                  ? "w-6 bg-primary"
                  : "w-2 bg-muted hover:bg-muted-foreground/50"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Horizontal scroll container for mobile
interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
  gap?: number;
  padding?: number;
}

export function HorizontalScroll({ 
  children, 
  className,
  gap = 12,
  padding = 16
}: HorizontalScrollProps) {
  return (
    <div
      className={cn(
        "flex overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4",
        className
      )}
      style={{ 
        gap,
        paddingLeft: padding,
        paddingRight: padding
      }}
    >
      {React.Children.map(children, (child, index) => (
        <div 
          key={index} 
          className="flex-shrink-0 snap-center first:ml-0 last:mr-0"
        >
          {child}
        </div>
      ))}
    </div>
  );
}

// Quick action card component
interface QuickActionCardProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: "default" | "primary" | "success" | "warning";
  pulse?: boolean;
  className?: string;
}

export function QuickActionCard({
  icon: Icon,
  label,
  onClick,
  variant = "default",
  pulse = false,
  className
}: QuickActionCardProps) {
  const variants = {
    default: "bg-card border hover:bg-accent",
    primary: "bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary",
    success: "bg-success/10 border-success/20 hover:bg-success/20 text-success",
    warning: "bg-warning/10 border-warning/20 hover:bg-warning/20 text-warning"
  };

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border min-w-[100px] transition-colors",
        variants[variant],
        pulse && "animate-pulse-soft",
        className
      )}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
    >
      <Icon className="h-6 w-6" />
      <span className="text-xs font-medium text-center">{label}</span>
    </motion.button>
  );
}
