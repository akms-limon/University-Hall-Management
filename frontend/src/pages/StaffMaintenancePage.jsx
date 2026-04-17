import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { maintenanceApi } from "@/api/maintenanceApi";
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

function StaffMaintenancePage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ status: "", category: "", severity: "", sort: "createdAt:desc" });
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, reported: 0, inspected: 0, inProgress: 0, completed: 0, closed: 0 });
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await maintenanceApi.listAssignedMaintenance({
        page,
        limit,
        status: filters.status || undefined,
        category: filters.category || undefined,
        severity: filters.severity || undefined,
        sortBy,
        sortOrder,
      });
      setItems(result.items || []);
      setSummary(result.summary || { total: 0, reported: 0, inspected: 0, inProgress: 0, completed: 0, closed: 0 });
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Failed to fetch assigned maintenance requests."));
    } finally {
      setIsLoading(false);
    }
  }, [filters.category, filters.severity, filters.status, limit, page, sortBy, sortOrder]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const summaryItems = [
    { title: "Assigned", value: String(summary.total), hint: "Total assigned to you", tone: "primary" },
    { title: "In Progress", value: String(summary.inProgress), hint: "Work underway", tone: "info" },
    { title: "Inspected", value: String(summary.inspected), hint: "Awaiting action", tone: "warning" },
    { title: "Completed", value: String(summary.completed), hint: "Finished work", tone: "success" },
  ];

  const updateFilter = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <DetailPageShell
      eyebrow="Staff Workspace"
      title="Assigned Maintenance"
      description="View and manage maintenance requests assigned to you."
    >
      <SummaryGrid items={summaryItems} />

      <ContentSection title="Assigned Requests" description="Open a request to log work, update status, or mark complete.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Select value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
              <option value="">All Statuses</option>
              {maintenanceStatusOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            <Select value={filters.category} onChange={(e) => updateFilter("category", e.target.value)}>
              <option value="">All Categories</option>
              {maintenanceCategoryOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            <Select value={filters.severity} onChange={(e) => updateFilter("severity", e.target.value)}>
              <option value="">All Severities</option>
              {maintenanceSeverityOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            <Select value={filters.sort} onChange={(e) => updateFilter("sort", e.target.value)}>
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>

          {isLoading ? <LoadingState label="Loading assigned maintenance..." /> : null}

          {!isLoading && error ? (
            <ErrorState title="Unable to load requests" description={error} actionLabel="Retry" onAction={fetchData} />
          ) : null}

          {!isLoading && !error && items.length === 0 ? (
            <EmptyState
              title="No assigned maintenance requests"
              description="Maintenance requests assigned to you will appear here."
            />
          ) : null}

          {!isLoading && !error && items.length > 0 ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={["Issue", "Category", "Severity", "Status", "Room", "Student", "Date", "Actions"]}
                  rows={items}
                  renderRow={(record) => (
                    <tr key={record.id} className="border-b border-slate-800/70 last:border-none">
                      <td className="px-4 py-3 font-medium">{record.issue}</td>
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
                      <td className="px-4 py-3 text-slate-300">{record.room?.roomNumber || "N/A"}</td>
                      <td className="px-4 py-3 text-slate-300">{record.reportedBy?.name || "N/A"}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(record.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/staff/maintenance/${record.id}`)}>
                          Work
                        </Button>
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
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge tone={maintenanceSeverityTone(record.severity)}>
                        {maintenanceSeverityLabel(record.severity)}
                      </StatusBadge>
                      <span className="text-xs text-slate-400">{maintenanceCategoryLabel(record.category)}</span>
                      <span className="text-xs text-slate-500">Room {record.room?.roomNumber || "N/A"}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">By: {record.reportedBy?.name || "N/A"} - {formatDate(record.createdAt)}</p>
                    <Button className="mt-3" size="sm" variant="secondary" onClick={() => navigate(`/staff/maintenance/${record.id}`)}>
                      Open &amp; Work
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

export default StaffMaintenancePage;
