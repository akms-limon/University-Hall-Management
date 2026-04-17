import { NavLink } from "react-router-dom";
import { getRoleNavigation, shouldUseExactNavMatch } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/utils/cn";

function shortLabel(label = "") {
  const [firstWord] = label.split(" ");
  return firstWord || label;
}

function BottomTabNav() {
  const { user } = useAuth();
  const items = getRoleNavigation(user.role).slice(0, 5);

  if (!items.length) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-[color:rgb(var(--ui-border)/0.65)] bg-[rgb(var(--bg-muted)/0.96)] px-1 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={shouldUseExactNavMatch(user.role, item.path)}
            className={({ isActive }) =>
              cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-semibold transition-colors",
                "min-h-11 text-[11px]",
                isActive
                  ? "text-[var(--role-accent-text)]"
                  : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-base))]"
              )
            }
          >
            <Icon size={17} />
            <span className="truncate">{shortLabel(item.label)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default BottomTabNav;
