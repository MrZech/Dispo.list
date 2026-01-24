import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatsCard({ title, value, icon, trend, trendUp, className }: StatsCardProps) {
  return (
    <div className={cn(
      "p-6 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 group",
      className
    )}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-3xl font-display font-bold mt-2 text-foreground group-hover:text-primary transition-colors">
            {value}
          </h3>
          {trend && (
            <p className={cn(
              "text-xs font-medium mt-1 flex items-center gap-1",
              trendUp ? "text-emerald-600" : "text-rose-600"
            )}>
              <span>{trendUp ? "↑" : "↓"}</span>
              {trend}
            </p>
          )}
        </div>
        <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
          {icon}
        </div>
      </div>
    </div>
  );
}
