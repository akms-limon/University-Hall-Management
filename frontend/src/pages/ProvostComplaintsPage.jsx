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
import { staffApi } from "@/api/staffApi";
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
  { label: "Status (A-Z)", value: "status:asc" },
];

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

function ProvostComplaintsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    severity: "",
    status: "",
    assignedTo: "",
    startDate: "",
    endDate: "",
    sort: "createdAt:desc",
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(defaultSummary);
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [staffOptions, setStaffOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchStaff = useCallback(async () => {
    try {
      const result = await staffApi.listStaff({
        page: 1,
        limit: 100,
        isActive: true,
        sortBy: "name",
        sortOrder: "asc",
      });
      setStaffOptions(result.items || []);
    } catch {
      setStaffOptions([]);
    }
  }, []);

  const fetchComplaints = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await complaintApi.listComplaints({
        page,
        limit,
        search: filters.search || undefined,
        category: filters.category || undefined,
        severity: filters.severity || undefined,
        status: filters.status || undefined,
        assignedTo: filters.assignedTo || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        sortBy,
        sortOrder,
      });

      setItems(result.items || []);
      setSummary(result.summary || defaultSummary);
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to fetch complaints."));
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.assignedTo,
    filters.category,
    filters.endDate,
    filters.search,
    filters.severity,
    filters.startDate,
    filters.status,
    limit,
    page,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleFilterChange = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const summaryItems = [
    { title: "Total", value: String(summary.totalComplaints), hint: "All complaints", tone: "primary" },
    { title: "Open", value: String(summary.open), hint: "Pending review", tone: "warning" },
    { title: "In Progress", value: String(summary.inProgress), hint: "Assigned in work", tone: "info" },
    { title: "Resolved", value: String(summary.resolved), hint: "Completed tasks", tone: "success" },
    { title: "Closed", value: String(summary.closed), hint: "Finalized", tone: "neutral" },
  ];

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Complaint Monitoring"
      description="Monitor complaint workflow, assign staff, and control issue resolution lifecycle."
    >
      <SummaryGrid items={summaryItems} />

      <ContentSection title="Complaints" description="Search, filter, assign, and manage complaint status.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
            <Input
              className="xl:col-span-2"
              placeholder="Search by title, student name, or email"
              value={filters.search}
              onChange={(event) => handleFilterChange("search", event.target.value)}
            />

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

            <Select value={filters.status} onChange={(event) => handleFilterChange("status", event.target.value)}>
              <option value="">All Statuses</option>
              {complaintStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.assignedTo} onChange={(event) => handleFilterChange("assignedTo", event.target.value)}>
              <option value="">All Assignees</option>
              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.user?.name || staff.staffId || "Unknown Staff"}
                </option>
              ))}
            </Select>

            <label className="block">
              <span className="sr-only">Start date</span>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(event) => handleFilterChange("startDate", event.target.value)}
              />
            </label>

            <label className="block">
              <span className="sr-only">End date</span>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(event) => handleFilterChange("endDate", event.target.value)}
              />
            </label>
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

          {isLoading ? <LoadingState label="Loading complaints..." /> : null}

          {!isLoading && error ? (
            <ErrorState title="Unable to load complaints" description={error} actionLabel="Retry" onAction={fetchComplaints} />
          ) : null}

          {!isLoading && !error && items.length === 0 ? (
            <EmptyState title="No complaints found" description="Try changing filters or search terms." />
          ) : null}

          {!isLoading && !error && items.length > 0 ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={["Title", "Student", "Category", "Severity", "Status", "Assignee", "Created", "Actions"]}
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
                      <td className="px-4 py-3 text-slate-300">{complaint.assignedTo?.user?.name || "Unassigned"}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(complaint.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => navigate(`/provost/complaints/${complaint.id}`)}>
                            View
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/provost/complaints/${complaint.id}`)}>
                            Assign
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/provost/complaints/${complaint.id}`)}>
                            Update Status
                          </Button>
                        </div>
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
                      <span className="text-xs text-slate-500">{formatDate(complaint.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Assignee: {complaint.assignedTo?.user?.name || "Unassigned"}</p>
                    <Button className="mt-3" size="sm" variant="secondary" onClick={() => navigate(`/provost/complaints/${complaint.id}`)}>
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

export default ProvostComplaintsPage;
