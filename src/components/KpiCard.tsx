import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  tone?: "default" | "warn" | "danger" | "success";
  sub?: string;
}

export function KpiCard({ label, value, unit, icon: Icon, tone = "default", sub }: Props) {
  const toneClass = {
    default: "text-slate-900",
    warn: "text-amber-600",
    danger: "text-red-600",
    success: "text-emerald-600",
  }[tone];

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="stat-label">{label}</div>
        {Icon && <Icon className="text-slate-400" size={18} />}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <div className={cn("stat-value", toneClass)}>{value}</div>
        {unit && <div className="text-sm text-slate-500">{unit}</div>}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
