import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ContentSection from "@/components/shared/ContentSection";
import DataTableShell from "@/components/shared/DataTableShell";
import DetailPageShell from "@/components/shared/DetailPageShell";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PaginationControls from "@/components/shared/PaginationControls";
import StatusBadge from "@/components/shared/StatusBadge";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { complaintApi } from "@/api/complaintApi";
import {
  complaintCategoryLabel,
  complaintCategoryOptions,
  complaintSeverityLabel,
  complaintSeverityOptions,
  complaintSeverityTone,
  complaintStatusLabel,
  complaintStatusOptions,
  complaintStatusTone,
} from "@/features/complaint-management/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const defaultSummary = {
  totalComplaints: 0,
  open: 0,
  inProgress: 0,
  resolved: 0,
  closed: 0,
};

const sortOptions = [
  { label: "Newest", value: "createdAt:desc" },
  { label: "Oldest", value: "createdAt:asc" },
  { label: "Updated (Newest)", value: "updatedAt:desc" },
  { label: "Severity (High First)", value: "severity:desc" },
];

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

function StaffComplaintsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    category: "",
    severity: "",
    sort: "createdAt:desc",
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(defaultSummary);
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchComplaints = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await complaintApi.listAssignedComplaints({
        page,
        limit,
        search: filters.search || undefined,
        status: filters.status || undefined,
        category: filters.category || undefined,
        severity: filters.severity || undefined,
        sortBy,
        sortOrder,
      });
      setItems(result.items || []);
      setSummary(result.summary || defaultSummary);
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to fetch assigned complaints."));
    } finally {
      setIsLoading(false);
    }
  }, [filters.category, filters.search, filters.severity, filters.status, limit, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleFilterChange = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const summaryItems = [
    { title: "Total", value: String(summary.totalComplaints), hint: "Assigned complaints", tone: "primary" },
    { title: "Open", value: String(summary.open), hint: "Not started", tone: "warning" },
    { title: "In Progress", value: String(summary.inProgress), hint: "Under work", tone: "info" },
    { title: "Resolved", value: String(summary.resolved), hint: "Finished", tone: "success" },
    { title: "Closed", value: String(summary.closed), hint: "Finalized", tone: "neutral" },
  ];

  return (
    <DetailPageShell
      eyebrow="Staff Workspace"
      title="Assigned Complaints"
      description="Review assigned complaint queue and update work progress."
    >
      <SummaryGrid items={summaryItems} />

      <ContentSection title="Complaint Queue" description="Filter and open assigned complaints for action.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Input
              className="xl:col-span-2"
              placeholder="Search by student, email, or title"
              value={filters.search}
              onChange={(event) => handleFilterChange("search", event.target.value)}
            />

            <Select value={filters.status} onChange={(event) => handleFilterChange("status", event.target.value)}>
              <option value="">All Statuses</option>
              {complaintStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.category} onChange={(event) => handleFilterChange("category", event.target.value)}>
              <option value="">All Categories</option>
              {complaintCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.severity} onChange={(event) => handleFilterChange("severity", event.target.value)}>
              <option value="">All Severities</option>
              {complaintSeverityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Select value={filters.sort} onChange={(event) => handleFilterChange("sort", event.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={fetchComplaints}>
              Refresh
            </Button>
          </div>

          {isLoading ? <LoadingState label="Loading assigned complaints..." /> : null}

          {!isLoading && error ? (
            <ErrorState title="Unable to load complaints" description={error} actionLabel="Retry" onAction={fetchComplaints} />
          ) : null}

          {!isLoading && !error && items.length === 0 ? (
            <EmptyState title="No assigned complaints" description="Assigned complaints will appear here." />
          ) : null}

          {!isLoading && !error && items.length > 0 ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={["Title", "Student", "Category", "Severity", "Status", "Updated", "Actions"]}
                  rows={items}
                  renderRow={(complaint) => (
                    <tr key={complaint.id} className="border-b border-slate-800/70 last:border-none">
                      <td className="px-4 py-3 font-medium">{complaint.title}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{complaint.student?.user?.name || "N/A"}</p>
                        <p className="text-xs text-slate-400">{complaint.student?.user?.email || "N/A"}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{complaintCategoryLabel(complaint.category)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={complaintSeverityTone(complaint.severity)}>
                          {complaintSeverityLabel(complaint.severity)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={complaintStatusTone(complaint.status)}>
                          {complaintStatusLabel(complaint.status)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(complaint.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/staff/complaints/${complaint.id}`)}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  )}
                />
              </div>

              <div className="grid gap-3 md:hidden">
                {items.map((complaint) => (
                  <article key={complaint.id} className="rounded-2xl border border-slate-700/60 bg-bg-card/75 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{complaint.title}</h3>
                      <StatusBadge tone={complaintStatusTone(complaint.status)}>
                        {complaintStatusLabel(complaint.status)}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{complaint.student?.user?.name || "N/A"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge tone={complaintSeverityTone(complaint.severity)}>
                        {complaintSeverityLabel(complaint.severity)}
                      </StatusBadge>
                      <span className="text-xs text-slate-400">{complaintCategoryLabel(complaint.category)}</span>
                      <span className="text-xs text-slate-500">{formatDate(complaint.updatedAt)}</span>
                    </div>
                    <Button className="mt-3" size="sm" variant="secondary" onClick={() => navigate(`/staff/complaints/${complaint.id}`)}>
                      Open Complaint
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

export default StaffComplaintsPage;
