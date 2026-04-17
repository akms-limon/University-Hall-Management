import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import { getRoleNavigation, getRoleNavigationGroups, shouldUseExactNavMatch } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/utils/cn";

function itemIsActive(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function SidebarNavItem({ item, role, compact = false, onNavigate }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={shouldUseExactNavMatch(role, item.path)}
      onClick={onNavigate}
      title={compact ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          "flex items-center rounded-[6px] border text-sm transition-all",
          compact ? "justify-center px-2 py-2.5" : "gap-3 px-2.5 py-2",
          isActive
            ? "border-[color:rgb(var(--ui-border)/0.42)] bg-[rgb(var(--bg-muted)/0.68)] text-[rgb(var(--accent-primary))]"
            : "border-transparent text-[rgb(var(--text-soft))] hover:bg-[rgb(var(--bg-muted)/0.5)] hover:text-[rgb(var(--accent-primary))]"
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-[5px] bg-[rgb(var(--bg-card)/0.95)] text-[rgb(var(--text-soft))]",
              isActive && "bg-[rgb(var(--accent-primary))] text-[rgb(var(--accent-warning))] shadow-[0_4px_12px_rgba(10,61,46,0.24)]"
            )}
          >
            <Icon size={14} />
          </span>
          {!compact ? <span className="flex-1 truncate">{item.label}</span> : null}
        </>
      )}
    </NavLink>
  );
}

function Sidebar({ onNavigate, collapsed = false, onToggleCollapse, mobile = false }) {
  const { user } = useAuth();
  const location = useLocation();
  const navGroups = getRoleNavigationGroups(user.role);
  const flatItems = getRoleNavigation(user.role);

  const activeSectionId = useMemo(
    () =>
      navGroups.find((group) => group.items.some((item) => itemIsActive(location.pathname, item.path)))?.id ||
      navGroups[0]?.id ||
      "",
    [location.pathname, navGroups]
  );
  const [expandedSectionId, setExpandedSectionId] = useState(activeSectionId);

  useEffect(() => {
    if (activeSectionId) {
      setExpandedSectionId(activeSectionId);
    }
  }, [activeSectionId]);

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col border-r border-[color:rgb(var(--ui-border)/0.28)] bg-[rgb(var(--bg-card)/0.92)] transition-[width] duration-200",
        collapsed && !mobile ? "w-[5rem]" : "w-[16.25rem]"
      )}
    >
      {!mobile ? (
        <div className={cn("flex shrink-0 items-center border-b border-[color:rgb(var(--ui-border)/0.25)] bg-[rgb(var(--bg-muted)/0.34)] px-3 py-3", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed ? (
            <p className="px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[rgb(var(--accent-primary))]">Navigation</p>
          ) : null}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="grid h-8 w-8 place-items-center rounded-[5px] border border-[color:rgb(var(--ui-border)/0.35)] bg-[rgb(var(--bg-card)/0.98)] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--accent-primary))]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
        </div>
      ) : null}

      <nav className={cn("min-h-0 flex-1 overflow-y-auto px-3 py-3", collapsed && !mobile ? "space-y-2" : "space-y-3")}>
        {collapsed && !mobile ? (
          flatItems.map((item, index) => (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.14, delay: index * 0.015 }}
            >
              <SidebarNavItem item={item} role={user.role} compact onNavigate={onNavigate} />
            </motion.div>
          ))
        ) : (
          navGroups.map((group, groupIndex) => {
            const expanded = expandedSectionId === group.id;
            return (
              <motion.section
                key={group.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.14, delay: groupIndex * 0.02 }}
                className="rounded-xl border border-[color:rgb(var(--ui-border)/0.14)] bg-[rgb(var(--bg-card)/0.35)] p-1.5"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSectionId((current) => (current === group.id ? "" : group.id))
                  }
                  className="flex w-full items-center justify-between rounded-[5px] px-2 py-1.5 text-left text-[11px] font-bold uppercase tracking-[0.09em] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg-muted)/0.48)]"
                >
                  <span>{group.label}</span>
                  {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {expanded ? (
                  <div className="mt-1 space-y-1">
                    {group.items.map((item) => (
                      <SidebarNavItem key={item.path} item={item} role={user.role} onNavigate={onNavigate} />
                    ))}
                  </div>
                ) : null}
              </motion.section>
            );
          })
        )}
      </nav>
    </aside>
  );
}

export default Sidebar;
