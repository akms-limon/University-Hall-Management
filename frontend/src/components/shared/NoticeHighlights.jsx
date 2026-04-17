import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "@/components/ui/Button";
import ContentSection from "@/components/shared/ContentSection";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import { noticeCategoryLabel, noticeCategoryTone } from "@/features/notice-board/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

function NoticeHighlights({
  title = "Latest Hall Notices",
  description = "Recent active notices in your feed.",
  detailsPathPrefix,
  allNoticesPath,
  fetcher,
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  const loadNotices = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await fetcher();
      setItems(result || []);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load notice highlights."));
    } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  return (
    <ContentSection title={title} description={description}>
      {isLoading ? <LoadingState label="Loading notices..." /> : null}
      {!isLoading && error ? (
        <ErrorState title="Unable to load notices" description={error} actionLabel="Retry" onAction={loadNotices} />
      ) : null}
      {!isLoading && !error && items.length === 0 ? (
        <EmptyState title="No recent notices" description="New notices will appear here once published." />
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((notice) => (
            <article key={notice.id} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-100">{notice.title}</p>
                {notice.isUrgent ? <StatusBadge tone="danger">Urgent</StatusBadge> : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge tone={noticeCategoryTone(notice.category)}>{noticeCategoryLabel(notice.category)}</StatusBadge>
                <span className="text-xs text-slate-400">{formatDate(notice.publishedDate)}</span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{notice.content?.slice(0, 140)}{notice.content?.length > 140 ? "..." : ""}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={`${detailsPathPrefix}/${notice.id}`}>
                  <Button size="sm" variant="secondary">Open</Button>
                </Link>
              </div>
            </article>
          ))}

          <Link to={allNoticesPath}>
            <Button size="sm" variant="ghost">View All Notices</Button>
          </Link>
        </div>
      ) : null}
    </ContentSection>
  );
}

export default NoticeHighlights;
