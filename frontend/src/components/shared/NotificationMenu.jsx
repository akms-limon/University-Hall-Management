import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import { notificationApi } from "@/api/notificationApi";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { formatDateTimeInDhaka } from "@/utils/formatDateTime";

function NotificationMenu() {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const loadUnreadCount = useCallback(async () => {
    try {
      const result = await notificationApi.unreadCount();
      setUnreadCount(result.unreadCount || 0);
    } catch {
      // Keep topbar resilient; ignore count fetch errors.
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await notificationApi.listMine({
        page: 1,
        limit: 8,
        sortOrder: "desc",
      });
      setItems(result.items || []);
      setUnreadCount(result.summary?.unreadCount || 0);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load notifications."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [loadNotifications, open]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
        }))
      );
      setUnreadCount(0);
    } catch (markError) {
      setError(getApiErrorMessage(markError, "Failed to mark notifications as read."));
    }
  };

  const handleOpenNotification = async (item) => {
    if (!item.isRead) {
      try {
        await notificationApi.markRead(item.id);
        setItems((prev) =>
          prev.map((entry) => (entry.id === item.id ? { ...entry, isRead: true } : entry))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Ignore and continue navigation.
      }
    }

    if (item.link) {
      navigate(item.link);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative grid h-9 w-9 place-items-center rounded-[5px] border border-[rgba(var(--accent-warning),0.7)] bg-[rgb(var(--accent-warning))] text-[rgb(var(--accent-primary))] shadow-[0_4px_10px_rgba(201,162,39,0.35)] hover:brightness-105"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Bell size={16} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[92vw] rounded-[8px] border border-[color:rgb(var(--ui-border)/0.3)] bg-[rgb(var(--bg-card)/0.98)] p-2 shadow-[var(--shadow-soft)]">
          <div className="mb-2 flex items-center justify-between gap-2 px-2 pt-1">
            <p className="text-sm font-semibold">Notifications</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md p-1 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg-muted)/0.72)] hover:text-[rgb(var(--text-base))]"
                aria-label="Refresh notifications"
                onClick={loadNotifications}
              >
                <RefreshCcw size={14} />
              </button>
              <button
                type="button"
                className="rounded-md p-1 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg-muted)/0.72)] hover:text-[rgb(var(--text-base))] disabled:opacity-40"
                aria-label="Mark all as read"
                disabled={!unreadCount}
                onClick={handleMarkAllRead}
              >
                <CheckCheck size={14} />
              </button>
            </div>
          </div>

          {isLoading ? <p className="px-2 py-6 text-xs text-[rgb(var(--text-muted))]">Loading notifications...</p> : null}
          {!isLoading && error ? <p className="px-2 py-6 text-xs text-red-300">{error}</p> : null}

          {!isLoading && !error && !items.length ? (
            <p className="px-2 py-6 text-xs text-[rgb(var(--text-muted))]">No notifications yet.</p>
          ) : null}

          {!isLoading && !error && items.length ? (
            <ul className="max-h-96 space-y-1 overflow-y-auto px-1 pb-1">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleOpenNotification(item)}
                    className={`w-full rounded-lg px-3 py-2 text-left hover:bg-[rgb(var(--bg-muted)/0.72)] ${
                      item.isRead
                        ? "opacity-90 text-[rgb(var(--text-base))]"
                        : "border border-[color:var(--role-accent-border)] bg-[var(--role-accent-soft)] text-[rgb(var(--text-base))]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold">{item.title}</p>
                      {!item.isRead ? <span className="h-2 w-2 rounded-full bg-[var(--role-accent-text)]" /> : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] text-[rgb(var(--text-soft))]">{item.message}</p>
                    <p className="mt-1 text-[10px] text-[rgb(var(--text-muted))]">{formatDateTimeInDhaka(item.createdAt, "")}</p>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="border-t border-[color:rgb(var(--ui-border)/0.7)] px-2 pt-2">
            <Button
              variant="ghost"
              className="w-full justify-center"
              onClick={() => {
                navigate("/notifications");
                setOpen(false);
              }}
            >
              View All Notifications
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default NotificationMenu;
