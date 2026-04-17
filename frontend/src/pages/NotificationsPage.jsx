import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCheck, ExternalLink, RefreshCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import ContentSection from "@/components/shared/ContentSection";
import DataTableShell from "@/components/shared/DataTableShell";
import DetailPageShell from "@/components/shared/DetailPageShell";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PaginationControls from "@/components/shared/PaginationControls";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { notificationApi } from "@/api/notificationApi";
import { formatDateTimeInDhaka } from "@/utils/formatDateTime";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const sortOptions = [
  { label: "Newest", value: "desc" },
  { label: "Oldest", value: "asc" },
];

function NotificationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [sortOrder, setSortOrder] = useState("desc");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    totalPages: 0,
    total: 0,
  });
  const [summary, setSummary] = useState({
    unreadCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingId, setMarkingId] = useState("");
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const readCount = useMemo(
    () => Math.max(0, Number(meta.total || 0) - Number(summary.unreadCount || 0)),
    [meta.total, summary.unreadCount]
  );

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await notificationApi.listMine({
        page,
        limit,
        sortOrder,
        unreadOnly: unreadOnly || undefined,
      });

      setItems(result.items || []);
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
      setSummary(result.summary || { unreadCount: 0 });
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to fetch notifications."));
    } finally {
      setIsLoading(false);
    }
  }, [limit, page, sortOrder, unreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (notification) => {
    if (!notification || notification.isRead) {
      if (notification?.link) {
        navigate(notification.link);
      }
      return;
    }

    setMarkingId(notification.id);
    try {
      await notificationApi.markRead(notification.id);
      setItems((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                isRead: true,
              }
            : item
        )
      );
      setSummary((prev) => ({
        ...prev,
        unreadCount: Math.max(0, Number(prev.unreadCount || 0) - 1),
      }));

      if (notification.link) {
        navigate(notification.link);
      }
    } catch (markError) {
      setError(getApiErrorMessage(markError, "Failed to mark notification as read."));
    } finally {
      setMarkingId("");
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await notificationApi.markAllRead();
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
        }))
      );
      setSummary((prev) => ({ ...prev, unreadCount: 0 }));
    } catch (markAllError) {
      setError(getApiErrorMessage(markAllError, "Failed to mark all notifications as read."));
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <DetailPageShell
      eyebrow="Notifications"
      title="Inbox"
      description="Track system events, review updates, and jump directly to related workflows."
      actions={[
        <Button key="refresh" variant="secondary" onClick={fetchNotifications}>
          <RefreshCcw size={15} className="mr-1" />
          Refresh
        </Button>,
        <Button
          key="mark-all"
          variant="primary"
          disabled={!summary.unreadCount || isMarkingAll}
          onClick={handleMarkAllRead}
        >
          <CheckCheck size={15} className="mr-1" />
          Mark All Read
        </Button>,
      ]}
    >
      <SummaryGrid
        items={[
          { title: "Total", value: String(meta.total || 0), hint: "Current page set", tone: "primary" },
          { title: "Unread", value: String(summary.unreadCount || 0), hint: "Needs attention", tone: "warning" },
          { title: "Read", value: String(readCount), hint: "Already reviewed", tone: "info" },
        ]}
      />

      <ContentSection title="My Notifications" description="Sorted latest first by default.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              value={unreadOnly ? "true" : "false"}
              onChange={(event) => {
                setPage(1);
                setUnreadOnly(event.target.value === "true");
              }}
            >
              <option value="false">All Notifications</option>
              <option value="true">Unread Only</option>
            </Select>

            <Select
              value={sortOrder}
              onChange={(event) => {
                setPage(1);
                setSortOrder(event.target.value);
              }}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {isLoading ? <LoadingState label="Loading notifications..." /> : null}
          {!isLoading && error ? (
            <ErrorState title="Unable to load notifications" description={error} actionLabel="Retry" onAction={fetchNotifications} />
          ) : null}

          {!isLoading && !error ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={["Title", "Message", "From", "Date", "Status", "Action"]}
                  rows={items}
                  emptyTitle="No notifications found"
                  emptyDescription="You are all caught up."
                  renderRow={(notification) => (
                    <tr key={notification.id} className="border-b border-slate-800/70 last:border-none align-top">
                      <td className="px-4 py-3 font-medium text-slate-100">{notification.title}</td>
                      <td className="px-4 py-3 text-slate-300">{notification.message}</td>
                      <td className="px-4 py-3 text-slate-400">{notification.actor?.name || "System"}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDateTimeInDhaka(notification.createdAt)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={notification.isRead ? "neutral" : "warning"}>
                          {notification.isRead ? "Read" : "Unread"}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={markingId === notification.id}
                          onClick={() => handleMarkRead(notification)}
                        >
                          <ExternalLink size={14} className="mr-1" />
                          {notification.link ? "Open" : "Mark Read"}
                        </Button>
                      </td>
                    </tr>
                  )}
                />
              </div>

              <div className="grid gap-3 md:hidden">
                {items.map((notification) => (
                  <article key={notification.id} className="rounded-2xl border border-slate-700/60 bg-bg-card/75 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-100">{notification.title}</h3>
                      <StatusBadge tone={notification.isRead ? "neutral" : "warning"} className="shrink-0">
                        {notification.isRead ? "Read" : "Unread"}
                      </StatusBadge>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{notification.message}</p>
                    <p className="mt-2 text-xs text-slate-500">{formatDateTimeInDhaka(notification.createdAt)}</p>
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={markingId === notification.id}
                        onClick={() => handleMarkRead(notification)}
                      >
                        <ExternalLink size={14} className="mr-1" />
                        {notification.link ? "Open" : "Mark Read"}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>

              <PaginationControls page={meta.page || page} totalPages={meta.totalPages || 0} onPageChange={setPage} />
            </>
          ) : null}
        </div>
      </ContentSection>
    </DetailPageShell>
  );
}

export default NotificationsPage;
