import { Menu, Search } from "lucide-react";
import Input from "@/components/ui/Input";
import AvatarMenu from "@/components/shared/AvatarMenu";
import NotificationMenu from "@/components/shared/NotificationMenu";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { appMeta } from "@/lib/constants";
import UniversityLogo from "@/components/shared/UniversityLogo";

function Topbar({ onOpenSidebar }) {
  return (
    <header className="z-20 shrink-0 border-b border-[color:rgb(var(--ui-border)/0.3)] bg-[rgb(var(--accent-primary))] text-white">
      <div className="container-page flex h-[4.25rem] items-center gap-3">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-[5px] border border-[rgba(var(--accent-warning),0.45)] bg-[rgba(var(--accent-warning),0.14)] text-[rgb(var(--accent-warning))] lg:hidden"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
        >
          <Menu size={16} />
        </button>

        <div className="flex min-w-0 shrink-0 items-center gap-2 pr-2">
          <UniversityLogo className="h-8 w-8 rounded-md" fallbackClassName="h-8 w-8 rounded-md text-[10px]" />
          <div className="min-w-0">
            <p className="max-w-[10.5rem] truncate text-sm font-display font-semibold sm:max-w-[16rem] sm:text-[15px]">
              {appMeta.hallName}
            </p>
            <p className="max-w-[10.5rem] truncate text-[11px] text-[rgba(255,255,255,0.72)] sm:max-w-[16rem]">
              {appMeta.universityName}
            </p>
          </div>
        </div>

        <div className="relative mx-auto hidden w-full max-w-xl flex-1 md:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.58)]" />
          <Input placeholder={`Search ${appMeta.shortName}...`} className="border-[rgba(var(--accent-warning),0.34)] bg-[rgba(255,255,255,0.08)] pl-8 text-white placeholder:text-[rgba(255,255,255,0.55)]" />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <NotificationMenu />
          <AvatarMenu />
        </div>
      </div>
    </header>
  );
}

export default Topbar;
