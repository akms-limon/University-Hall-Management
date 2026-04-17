import { AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";

function ErrorState({ title, description, actionLabel, onAction }) {
  return (
    <div className="grid min-h-[240px] place-items-center rounded-2xl border border-red-400/30 bg-red-500/8 p-6 shadow-[0_8px_30px_rgba(127,29,29,0.14)]">
      <div className="text-center max-w-md">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl border border-red-300/30 bg-red-500/20">
          <AlertTriangle size={18} className="text-red-300" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-red-300/90">{description}</p>
        {actionLabel ? (
          <Button className="mt-4" variant="danger" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default ErrorState;
