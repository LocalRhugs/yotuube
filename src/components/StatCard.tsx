import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { forwardRef } from "react";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  platform?: "youtube" | "facebook" | "instagram";
}

const platformColors = {
  youtube: "text-youtube",
  facebook: "text-facebook",
  instagram: "text-instagram",
};

const StatCard = forwardRef<HTMLDivElement, StatCardProps>(({ title, value, change, changeType = "neutral", icon: Icon, platform }, ref) => {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-5 shadow-card border border-border/50 hover:border-border transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-display font-bold text-foreground">{value}</p>
          {change && (
            <p
              className={cn(
                "text-xs font-medium",
                changeType === "positive" && "text-success",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className={cn(
          "w-10 h-10 rounded-lg bg-muted flex items-center justify-center",
          platform && platformColors[platform]
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
});

StatCard.displayName = "StatCard";

export default StatCard;
