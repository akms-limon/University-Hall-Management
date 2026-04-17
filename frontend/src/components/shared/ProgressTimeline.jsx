import { CheckCircle2, CircleDot, Clock3 } from "lucide-react";
import { cn } from "@/utils/cn";

const iconMap = {
  completed: CheckCircle2,
  active: CircleDot,
  pending: Clock3,
};

const toneMap = {
  completed: "text-emerald-300",
  active: "text-cyan-300",
  pending: "text-slate-500",
};

function ProgressTimeline({ steps }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => {
        const Icon = iconMap[step.status] || Clock3;
        return (
          <li key={step.label} className="flex gap-3">
            <div className={cn("mt-0.5", toneMap[step.status])}>
              <Icon size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{step.label}</p>
              {step.note ? <p className="text-xs text-slate-400 mt-1">{step.note}</p> : null}
              {index < steps.length - 1 ? <div className="mt-2 h-3 border-l border-slate-700/70 ml-1.5" /> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default ProgressTimeline;

