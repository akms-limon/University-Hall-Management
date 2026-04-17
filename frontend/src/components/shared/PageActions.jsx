import { cn } from "@/utils/cn";

function PageActions({ className, children }) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

export default PageActions;
