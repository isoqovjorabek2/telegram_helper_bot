import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: string;
  color?: "primary" | "accent" | "success" | "warning";
}

export function StatCard({ title, value, icon: Icon, description, trend, color = "primary" }: StatCardProps) {
  const colorStyles = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-purple-500/10 text-purple-600",
    success: "bg-green-500/10 text-green-600",
    warning: "bg-orange-500/10 text-orange-600",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="mt-2 text-3xl font-bold tracking-tight text-foreground font-display">{value}</h3>
          {(description || trend) && (
            <div className="mt-2 flex items-center text-sm">
              {trend && <span className="text-green-600 font-medium mr-2">{trend}</span>}
              {description && <span className="text-muted-foreground">{description}</span>}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorStyles[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
}
