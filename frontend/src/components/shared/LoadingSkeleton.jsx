import { cn } from "@/utils/cn";

function LoadingSkeleton({ className }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-700/45", className)} />;
}

export default LoadingSkeleton;

