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
import { maintenanceApi } from "@/api/maintenanceApi";
import { staffApi } from "@/api/staffApi";
import {
  maintenanceCategoryLabel,
  maintenanceCategoryOptions,
  maintenanceSeverityLabel,
  maintenanceSeverityOptions,
  maintenanceSeverityTone,
  maintenanceStatusLabel,
  maintenanceStatusOptions,
  maintenanceStatusTone,
} from "@/features/maintenance/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const defaultSummary = {
  total: 0,
  reported: 0,
  inspected: 0,
  inProgress: 0,
  completed: 0,
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

function ProvostMaintenancePage() {
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

  const fetchMaintenance = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await maintenanceApi.listMaintenance({
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
      setError(getApiErrorMessage(loadError, "Failed to fetch maintenance requests."));
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
    fetchMaintenance();
  }, [fetchMaintenance]);

  const updateFilter = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const summaryItems = [
    { title: "Total", value: String(summary.total), hint: "All maintenance requests", tone: "primary" },
    { title: "Reported", value: String(summary.reported), hint: "Waiting inspection", tone: "warning" },
    { title: "Inspected", value: String(summary.inspected), hint: "Inspected records", tone: "info" },
    { title: "In Progress", value: String(summary.inProgress), hint: "Work underway", tone: "primary" },
    { title: "Completed", value: String(summary.completed), hint: "Completed work", tone: "success" },
    { title: "Closed", value: String(summary.closed), hint: "Closed records", tone: "neutral" },
  ];

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Maintenance Monitoring"
      description="Monitor maintenance workflow, assign staff, and track completion/cost details."
    >
      <SummaryGrid items={summaryItems} />

      <ContentSection title="Maintenance Requests" description="Search, filter, assign, and monitor maintenance records.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
            <Input
              className="xl:col-span-2"
              placeholder="Search by room, student, or issue"
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
            />

            <Select value={filters.category} onChange={(event) => updateFilter("category", event.target.value)}>
              <option value="">All Categories</option>
              {maintenanceCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.severity} onChange={(event) => updateFilter("severity", event.target.value)}>
              <option value="">All Severities</option>
              {maintenanceSeverityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="">All Statuses</option>
              {maintenanceStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.assignedTo} onChange={(event) => updateFilter("assignedTo", event.target.value)}>
              <option value="">All Assignees</option>
              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.user?.name || staff.staffId || "Unknown Staff"}
                </option>
              ))}
            </Select>

            <Input type="date" value={filters.startDate} onChange={(event) => updateFilter("startDate", event.target.value)} />
            <Input type="date" value={filters.endDate} onChange={(event) => updateFilter("endDate", event.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={fetchMaintenance}>
              Refresh
            </Button>
          </div>

          {isLoading ? <LoadingState label="Loading maintenance requests..." /> : null}

          {!isLoading && error ? (
            <ErrorState title="Unable to load maintenance requests" description={error} actionLabel="Retry" onAction={fetchMaintenance} />
          ) : null}

          {!isLoading && !error && items.length === 0 ? (
            <EmptyState title="No maintenance requests found" description="Try changing filters or search terms." />
          ) : null}

          {!isLoading && !error && items.length > 0 ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={["Issue", "Room", "Student", "Category", "Severity", "Status", "Assignee", "Created", "Actions"]}
                  rows={items}
                  renderRow={(record) => (
                    <tr key={record.id} className="border-b border-slate-800/70 last:border-none">
                      <td className="px-4 py-3 font-medium">{record.issue}</td>
                      <td className="px-4 py-3 text-slate-300">{record.room?.roomNumber || "N/A"}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{record.reportedBy?.name || "N/A"}</p>
                        <p className="text-xs text-slate-400">{record.reportedBy?.email || "N/A"}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{maintenanceCategoryLabel(record.category)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={maintenanceSeverityTone(record.severity)}>
                          {maintenanceSeverityLabel(record.severity)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={maintenanceStatusTone(record.status)}>
                          {maintenanceStatusLabel(record.status)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{record.assignedTo?.user?.name || "Unassigned"}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(record.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => navigate(`/provost/maintenance/${record.id}`)}>
                            View
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/provost/maintenance/${record.id}`)}>
                            Assign
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/provost/maintenance/${record.id}`)}>
                            Update Status
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                />
              </div>

              <div className="grid gap-3 md:hidden">
                {items.map((record) => (
                  <article key={record.id} className="rounded-2xl border border-slate-700/60 bg-bg-card/75 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{record.issue}</h3>
                      <StatusBadge tone={maintenanceStatusTone(record.status)}>
                        {maintenanceStatusLabel(record.status)}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{record.reportedBy?.name || "N/A"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge tone={maintenanceSeverityTone(record.severity)}>
                        {maintenanceSeverityLabel(record.severity)}
                      </StatusBadge>
                      <span className="text-xs text-slate-400">{maintenanceCategoryLabel(record.category)}</span>
                      <span className="text-xs text-slate-500">Room {record.room?.roomNumber || "N/A"}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Assignee: {record.assignedTo?.user?.name || "Unassigned"}</p>
                    <Button className="mt-3" size="sm" variant="secondary" onClick={() => navigate(`/provost/maintenance/${record.id}`)}>
                      Open Request
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

export default ProvostMaintenancePage;
