import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import ContentSection from "@/components/shared/ContentSection";
import DataTableShell from "@/components/shared/DataTableShell";
import DetailPageShell from "@/components/shared/DetailPageShell";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PaginationControls from "@/components/shared/PaginationControls";
import StatusBadge from "@/components/shared/StatusBadge";
import { noticeApi } from "@/api/noticeApi";
import {
  noticeCategoryLabel,
  noticeCategoryOptions,
  noticeCategoryTone,
} from "@/features/notice-board/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

function StudentNoticesPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    urgent: "",
    sort: "publishedDate:desc",
  });
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchNotices = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await noticeApi.listMine({
        page,
        limit,
        search: filters.search || undefined,
        category: filters.category || undefined,
        isUrgent: filters.urgent === "" ? undefined : filters.urgent === "true",
        sortBy,
        sortOrder,
      });
      setItems(result.items || []);
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to fetch notices."));
    } finally {
      setIsLoading(false);
    }
  }, [filters.category, filters.search, filters.urgent, limit, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const updateFilter = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <DetailPageShell
      eyebrow="Student Workspace"
      title="Notice Board"
      description="View official notices relevant to students and hall residents."
    >
      <ContentSection title="Notices" description="Latest active notices for your role.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Input
              placeholder="Search by title or content"
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
            />

            <Select value={filters.category} onChange={(event) => updateFilter("category", event.target.value)}>
              <option value="">All Categories</option>
              {noticeCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.urgent} onChange={(event) => updateFilter("urgent", event.target.value)}>
              <option value="">All Priorities</option>
              <option value="true">Urgent Only</option>
              <option value="false">Regular Only</option>
            </Select>

            <Select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
              <option value="publishedDate:desc">Newest</option>
              <option value="publishedDate:asc">Oldest</option>
            </Select>
          </div>

          {isLoading ? <LoadingState label="Loading notices..." /> : null}
          {!isLoading && error ? (
            <ErrorState title="Unable to load notices" description={error} actionLabel="Retry" onAction={fetchNotices} />
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            <EmptyState title="No notices available" description="There are no active notices at the moment." />
          ) : null}

          {!isLoading && !error && items.length > 0 ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={["Title", "Category", "Urgent", "Published", "Preview", "Actions"]}
                  rows={items}
                  renderRow={(notice) => (
                    <tr key={notice.id} className="border-b border-slate-800/70 last:border-none">
                      <td className="px-4 py-3 font-medium">{notice.title}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={noticeCategoryTone(notice.category)}>
                          {noticeCategoryLabel(notice.category)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        {notice.isUrgent ? <StatusBadge tone="danger">Urgent</StatusBadge> : <StatusBadge tone="neutral">No</StatusBadge>}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(notice.publishedDate)}</td>
                      <td className="px-4 py-3 text-slate-300">{notice.content?.slice(0, 80) || ""}{notice.content?.length > 80 ? "..." : ""}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/student/notices/${notice.id}`)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  )}
                />
              </div>

              <div className="grid gap-3 md:hidden">
                {items.map((notice) => (
                  <article key={notice.id} className="rounded-2xl border border-slate-700/60 bg-bg-card/75 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{notice.title}</h3>
                      {notice.isUrgent ? <StatusBadge tone="danger">Urgent</StatusBadge> : null}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge tone={noticeCategoryTone(notice.category)}>{noticeCategoryLabel(notice.category)}</StatusBadge>
                      <span className="text-xs text-slate-500">{formatDate(notice.publishedDate)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{notice.content?.slice(0, 120)}{notice.content?.length > 120 ? "..." : ""}</p>
                    <Button className="mt-3" size="sm" variant="secondary" onClick={() => navigate(`/student/notices/${notice.id}`)}>
                      Open Notice
                    </Button>
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

export default StudentNoticesPage;

