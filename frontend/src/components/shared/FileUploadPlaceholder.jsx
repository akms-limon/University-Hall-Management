import { UploadCloud } from "lucide-react";
import Button from "@/components/ui/Button";

function FileUploadPlaceholder({ title = "Upload attachments", description = "PNG, JPG, PDF up to 10MB." }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-600/70 bg-slate-900/45 p-5 text-center">
      <div className="mx-auto h-11 w-11 rounded-xl bg-slate-800/80 border border-slate-600/60 grid place-items-center">
        <UploadCloud size={18} className="text-slate-300" />
      </div>
      <h4 className="mt-3 font-semibold">{title}</h4>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
      <Button variant="secondary" size="sm" className="mt-4">
        Select Files
      </Button>
    </div>
  );
}

export default FileUploadPlaceholder;

