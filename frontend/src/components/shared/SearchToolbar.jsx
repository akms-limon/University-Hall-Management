import { Filter, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function SearchToolbar({ value, onChange, placeholder = "Search...", actions }) {
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-bg-card/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full flex-1 sm:min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input className="pl-9" value={value} onChange={onChange} placeholder={placeholder} />
        </div>
        <Button variant="secondary" size="md" className="w-full sm:w-auto">
          <Filter size={14} className="mr-1" />
          Filters
        </Button>
        {actions}
      </div>
    </div>
  );
}

export default SearchToolbar;
