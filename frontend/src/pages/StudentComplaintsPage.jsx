import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
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

const sortOptions = [
  { label: "Newest", value: "createdAt:desc" },
  { label: "Oldest", value: "createdAt:asc" },
  { label: "Severity (High First)", value: "severity:desc" },
  { label: "Status (A-Z)", value: "status:asc" },
];

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

function StudentComplaintsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    status: "",
    category: "",
    severity: "",
    sort: "createdAt:desc",
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    totalComplaints: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
  });
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchComplaints = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await complaintApi.listMyComplaints({
        page,
        limit,
        status: filters.status || undefined,
        category: filters.category || undefined,
        severity: filters.severity || undefined,
        sortBy,
        sortOrder,
      });

      setItems(result.items || []);
      setSummary(
        result.summary || {
          totalComplaints: 0,
          open: 0,
          inProgress: 0,
          resolved: 0,
          closed: 0,
        }
      );
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to fetch complaints."));
    } finally {
      setIsLoading(false);
    }
  }, [filters.category, filters.severity, filters.status, limit, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const summaryItems = [
    { title: "Total", value: String(summary.totalComplaints), hint: "All complaints", tone: "primary" },
    { title: "Open", value: String(summary.open), hint: "New complaints", tone: "warning" },
    { title: "In Progress", value: String(summary.inProgress), hint: "Work in progress", tone: "info" },
    { title: "Resolved", value: String(summary.resolved), hint: "Resolved by staff", tone: "success" },
  ];

  const updateFilter = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <DetailPageShell
      eyebrow="Student Workspace"
      title="My Complaints"
      description="Track complaint status and submit feedback when issues are resolved."
      actions={[
        <Button key="new" onClick={() => navigate("/student/complaints/new")}> 
          <Plus size={16} className="mr-1" />
          New Complaint
        </Button>,
      ]}
    >
      <SummaryGrid items={summaryItems} />

      <ContentSection title="Complaint History" description="Review all complaints submitted by you.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="">All Statuses</option>
              {complaintStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.category} onChange={(event) => updateFilter("category", event.target.value)}>
              <option value="">All Categories</option>
              {complaintCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.severity} onChange={(event) => updateFilter("severity", event.target.value)}>
              <option value="">All Severities</option>
              {complaintSeverityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {isLoading ? <LoadingState label="Loading complaints..." /> : null}

          {!isLoading && error ? (
            <ErrorState title="Unable to load complaints" description={error} actionLabel="Retry" onAction={fetchComplaints} />
          ) : null}

          {!isLoading && !error && items.length === 0 ? (
            <EmptyState
              title="No complaints yet"
              description="You can submit a complaint when you face any hall-related issue."
              actionLabel="Submit Complaint"
              onAction={() => navigate("/student/complaints/new")}
            />
          ) : null}

          {!isLoading && !error && items.length > 0 ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={["Title", "Category", "Severity", "Status", "Assigned", "Date", "Actions"]}
                  rows={items}
                  renderRow={(complaint) => (
                    <tr key={complaint.id} className="border-b border-slate-800/70 last:border-none">
                      <td className="px-4 py-3 font-medium">{complaint.title}</td>
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
                      <td className="px-4 py-3 text-slate-300">{complaint.assignedTo?.user?.name || "Unassigned"}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(complaint.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/student/complaints/${complaint.id}`)}>
                          View
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

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge tone={complaintSeverityTone(complaint.severity)}>
                        {complaintSeverityLabel(complaint.severity)}
                      </StatusBadge>
                      <span className="text-xs text-slate-400">{complaintCategoryLabel(complaint.category)}</span>
                      <span className="text-xs text-slate-500">{formatDate(complaint.createdAt)}</span>
                    </div>

                    <Button className="mt-3" size="sm" variant="secondary" onClick={() => navigate(`/student/complaints/${complaint.id}`)}>
                      View Details
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

export default StudentComplaintsPage;
