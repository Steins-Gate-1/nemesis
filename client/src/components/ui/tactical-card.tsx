import * as React from "react"
import { cn } from "@/lib/utils"

const TacticalCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'danger' | 'warning' }
>(({ className, variant = 'default', children, ...props }, ref) => {
  
  const borders = {
    default: "border-primary/30",
    danger: "border-destructive/50 critical-pulse",
    warning: "border-warning/50",
  };

  const glows = {
    default: "shadow-[0_4px_30px_rgba(0,255,255,0.03)]",
    danger: "shadow-[0_4px_30px_rgba(255,0,0,0.1)]",
    warning: "shadow-[0_4px_30px_rgba(255,165,0,0.1)]",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative bg-card/60 backdrop-blur-sm border rounded-sm overflow-hidden",
        borders[variant],
        glows[variant],
        className
      )}
      {...props}
    >
      {/* Corner accents */}
      <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${variant === 'danger' ? 'border-destructive' : 'border-primary/50'}`}></div>
      <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${variant === 'danger' ? 'border-destructive' : 'border-primary/50'}`}></div>
      
      {children}
    </div>
  )
})
TacticalCard.displayName = "TacticalCard"

export { TacticalCard }
