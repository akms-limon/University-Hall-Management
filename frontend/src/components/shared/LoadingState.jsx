import { LoaderCircle } from "lucide-react";

function LoadingState({ label = "Loading..." }) {
  return (
    <div className="grid min-h-[240px] place-items-center rounded-2xl border border-[color:rgb(var(--ui-border)/0.65)] bg-[rgb(var(--bg-card)/0.9)] p-6 shadow-[var(--shadow-soft)]">
      <div className="text-center">
        <LoaderCircle size={24} className="mx-auto animate-spin text-[var(--role-accent-text)]" />
        <p className="mt-3 text-sm text-[rgb(var(--text-muted))]">{label}</p>
      </div>
    </div>
  );
}

export default LoadingState;
