import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Avatar from "@/components/ui/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { roleLabels } from "@/lib/constants";
import Button from "@/components/ui/Button";

function AvatarMenu() {
  const { user, logout, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const rootRef = useRef(null);

  useEffect(() => {
    refreshUser().catch(() => {});
  }, [refreshUser]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-[5px] border border-[rgba(var(--accent-warning),0.45)] bg-[rgba(var(--accent-warning),0.14)] px-2 py-1.5 text-left text-[rgb(var(--accent-warning))] transition-colors hover:bg-[rgba(var(--accent-warning),0.2)]"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <Avatar size="sm" name={user.name} src={user.profilePhoto} />
        <span className="hidden sm:block">
          <span className="block text-xs font-semibold">{user.name}</span>
          <span className="block text-[11px] text-[rgba(255,255,255,0.76)]">{roleLabels[user.role]}</span>
        </span>
        <ChevronDown size={14} className="text-[rgb(var(--accent-warning))]" />
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-[color:rgb(var(--ui-border)/0.3)] bg-[rgb(var(--bg-card)/0.98)] p-2 shadow-[var(--shadow-soft)]">
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[rgb(var(--text-base))] hover:bg-[rgb(var(--bg-muted)/0.72)]"
          >
            <UserRound size={14} className="inline mr-2" />
            Profile
          </Link>
          <div className="my-2 border-t border-[color:rgb(var(--ui-border)/0.7)]" />
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut size={14} className="mr-2" />
            Logout
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default AvatarMenu;
