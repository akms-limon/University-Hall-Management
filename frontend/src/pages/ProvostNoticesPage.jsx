import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ContentSection from "@/components/shared/ContentSection";
import DataTableShell from "@/components/shared/DataTableShell";
import DetailPageShell from "@/components/shared/DetailPageShell";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PaginationControls from "@/components/shared/PaginationControls";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { noticeApi } from "@/api/noticeApi";
import {
  noticeAudienceLabel,
  noticeAudienceOptions,
  noticeCategoryLabel,
  noticeCategoryOptions,
  noticeCategoryTone,
} from "@/features/notice-board/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const defaultSummary = {
  total: 0,
  active: 0,
  urgent: 0,
  inactive: 0,
};

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

function ProvostNoticesPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    targetAudience: "",
    isActive: "",
    isUrgent: "",
    sort: "publishedDate:desc",
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(defaultSummary);
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmState, setConfirmState] = useState({
    open: false,
    action: "",
    noticeId: "",
  });

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchNotices = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await noticeApi.listNotices({
        page,
        limit,
        search: filters.search || undefined,
        category: filters.category || undefined,
        targetAudience: filters.targetAudience || undefined,
        isActive: filters.isActive === "" ? undefined : filters.isActive === "true",
        isUrgent: filters.isUrgent === "" ? undefined : filters.isUrgent === "true",
        sortBy,
        sortOrder,
      });
      setItems(result.items || []);
      setSummary(result.summary || defaultSummary);
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to fetch notices."));
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.category,
    filters.isActive,
    filters.isUrgent,
    filters.search,
    filters.targetAudience,
    limit,
    page,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const updateFilter = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const summaryItems = [
    { title: "Total Notices", value: String(summary.total), hint: "All notices", tone: "primary" },
    { title: "Active", value: String(summary.active), hint: "Visible in feeds", tone: "success" },
    { title: "Urgent", value: String(summary.urgent), hint: "High-priority notices", tone: "danger" },
    { title: "Inactive", value: String(summary.inactive), hint: "Not visible", tone: "neutral" },
  ];

  const handlePublish = async (noticeId) => {
    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      await noticeApi.publishNotice(noticeId);
      setSuccessMessage("Notice published successfully.");
      await fetchNotices();
    } catch (publishError) {
      setError(getApiErrorMessage(publishError, "Failed to publish notice."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetActive = async () => {
    const current = items.find((entry) => entry.id === confirmState.noticeId);
    if (!current) {
      setConfirmState({ open: false, action: "", noticeId: "" });
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      await noticeApi.setNoticeActive(current.id, !current.isActive);
      setSuccessMessage(!current.isActive ? "Notice activated successfully." : "Notice deactivated successfully.");
      await fetchNotices();
    } catch (toggleError) {
      setError(getApiErrorMessage(toggleError, "Failed to update notice status."));
    } finally {
      setIsSaving(false);
      setConfirmState({ open: false, action: "", noticeId: "" });
    }
  };

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Notice Management"
      description="Create, publish, and manage role-targeted notice visibility."
      actions={[
        <Button key="refresh" variant="secondary" onClick={fetchNotices}>
          Refresh
        </Button>,
        <Button key="create" onClick={() => navigate("/provost/notices/new")}>
          Create Notice
        </Button>,
      ]}
    >
      <SummaryGrid items={summaryItems} />

      <ContentSection title="Notices" description="Search, filter, and manage published notices.">
        <div className="space-y-4">
          {successMessage ? (
            <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              {successMessage}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Input
              className="xl:col-span-2"
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
            <Select value={filters.targetAudience} onChange={(event) => updateFilter("targetAudience", event.target.value)}>
              <option value="">All Audiences</option>
              {noticeAudienceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select value={filters.isActive} onChange={(event) => updateFilter("isActive", event.target.value)}>
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
            <Select value={filters.isUrgent} onChange={(event) => updateFilter("isUrgent", event.target.value)}>
              <option value="">All Priority</option>
              <option value="true">Urgent</option>
              <option value="false">Regular</option>
            </Select>
          </div>

          <Select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
            <option value="publishedDate:desc">Newest Published</option>
            <option value="publishedDate:asc">Oldest Published</option>
            <option value="updatedAt:desc">Recently Updated</option>
            <option value="title:asc">Title A-Z</option>
          </Select>

          {isLoading ? <LoadingState label="Loading notices..." /> : null}
          {!isLoading && error ? (
            <ErrorState title="Unable to load notices" description={error} actionLabel="Retry" onAction={fetchNotices} />
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            <EmptyState title="No notices found" description="Try changing filters or create a new notice." />
          ) : null}

          {!isLoading && !error && items.length > 0 ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={["Title", "Category", "Audience", "Urgent", "Status", "Published", "Actions"]}
                  rows={items}
                  renderRow={(notice) => (
                    <tr key={notice.id} className="border-b border-slate-800/70 last:border-none">
                      <td className="px-4 py-3 font-medium">{notice.title}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={noticeCategoryTone(notice.category)}>{noticeCategoryLabel(notice.category)}</StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{noticeAudienceLabel(notice.targetAudience)}</td>
                      <td className="px-4 py-3">
                        {notice.isUrgent ? <StatusBadge tone="danger">Urgent</StatusBadge> : <StatusBadge tone="neutral">Regular</StatusBadge>}
                      </td>
                      <td className="px-4 py-3">
                        {notice.isActive ? <StatusBadge tone="success">Active</StatusBadge> : <StatusBadge tone="neutral">Inactive</StatusBadge>}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(notice.publishedDate)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => navigate(`/provost/notices/${notice.id}`)}>
                            View
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/provost/notices/${notice.id}/edit`)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isSaving}
                            onClick={() =>
                              setConfirmState({ open: true, action: "active", noticeId: notice.id })
                            }
                          >
                            {notice.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button size="sm" disabled={isSaving} onClick={() => handlePublish(notice.id)}>
                            Publish
                          </Button>
                        </div>
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
                      {notice.isActive ? <StatusBadge tone="success">Active</StatusBadge> : <StatusBadge tone="neutral">Inactive</StatusBadge>}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Audience: {noticeAudienceLabel(notice.targetAudience)}</p>
                    <p className="mt-1 text-xs text-slate-400">Published: {formatDate(notice.publishedDate)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => navigate(`/provost/notices/${notice.id}`)}>
                        View
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/provost/notices/${notice.id}/edit`)}>
                        Edit
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

      <ConfirmDialog
        open={confirmState.open}
        onClose={() => setConfirmState({ open: false, action: "", noticeId: "" })}
        onConfirm={handleSetActive}
        title="Update notice visibility?"
        description="This will immediately change whether users can see this notice in regular feeds."
        confirmLabel={isSaving ? "Saving..." : "Confirm"}
        confirmDisabled={isSaving}
      />
    </DetailPageShell>
  );
}

export default ProvostNoticesPage;
