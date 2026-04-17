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
import { staffApi } from "@/api/staffApi";
import { supportTicketApi } from "@/api/supportTicketApi";
import {
  supportTicketCategoryLabel,
  supportTicketCategoryOptions,
  supportTicketPriorityLabel,
  supportTicketPriorityOptions,
  supportTicketPriorityTone,
  supportTicketStatusLabel,
  supportTicketStatusOptions,
  supportTicketStatusTone,
} from "@/features/support-ticket/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const defaultSummary = {
  total: 0,
  open: 0,
  inProgress: 0,
  resolved: 0,
  closed: 0,
};

const sortOptions = [
  { label: "Newest", value: "createdAt:desc" },
  { label: "Oldest", value: "createdAt:asc" },
  { label: "Updated (Newest)", value: "updatedAt:desc" },
  { label: "Priority (High First)", value: "priority:desc" },
  { label: "Status (A-Z)", value: "status:asc" },
];

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

function ProvostSupportTicketsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    priority: "",
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

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await supportTicketApi.listTickets({
        page,
        limit,
        search: filters.search || undefined,
        category: filters.category || undefined,
        priority: filters.priority || undefined,
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
      setError(getApiErrorMessage(loadError, "Failed to fetch support tickets."));
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.assignedTo,
    filters.category,
    filters.endDate,
    filters.priority,
    filters.search,
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
    fetchTickets();
  }, [fetchTickets]);

  const updateFilter = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const summaryItems = [
    { title: "Total", value: String(summary.total), hint: "All support tickets", tone: "primary" },
    { title: "Open", value: String(summary.open), hint: "Pending review", tone: "warning" },
    { title: "In Progress", value: String(summary.inProgress), hint: "Active handling", tone: "info" },
    { title: "Resolved", value: String(summary.resolved), hint: "Resolved tickets", tone: "success" },
    { title: "Closed", value: String(summary.closed), hint: "Closed tickets", tone: "neutral" },
  ];

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Support Ticket Monitoring"
      description="Monitor ticket workflow, assign staff, and supervise support conversations."
    >
      <SummaryGrid items={summaryItems} />

      <ContentSection title="Support Tickets" description="Search, filter, assign, and update support tickets.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
            <Input
              className="xl:col-span-2"
              placeholder="Search by subject, student name, or email"
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
            />
            <Select value={filters.category} onChange={(event) => updateFilter("category", event.target.value)}>
              <option value="">All Categories</option>
              {supportTicketCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select value={filters.priority} onChange={(event) => updateFilter("priority", event.target.value)}>
              <option value="">All Priorities</option>
              {supportTicketPriorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="">All Statuses</option>
              {supportTicketStatusOptions.map((option) => (
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
            <Button variant="secondary" onClick={fetchTickets}>
              Refresh
            </Button>
          </div>

          {isLoading ? <LoadingState label="Loading support tickets..." /> : null}
          {!isLoading && error ? (
            <ErrorState title="Unable to load support tickets" description={error} actionLabel="Retry" onAction={fetchTickets} />
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            <EmptyState title="No support tickets found" description="Try changing filters or search terms." />
          ) : null}

          {!isLoading && !error && items.length > 0 ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={["Subject", "Student", "Category", "Priority", "Status", "Assignee", "Created", "Actions"]}
                  rows={items}
                  renderRow={(ticket) => (
                    <tr key={ticket.id} className="border-b border-slate-800/70 last:border-none">
                      <td className="px-4 py-3 font-medium">{ticket.subject}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{ticket.student?.user?.name || "N/A"}</p>
                        <p className="text-xs text-slate-400">{ticket.student?.user?.email || "N/A"}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{supportTicketCategoryLabel(ticket.category)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={supportTicketPriorityTone(ticket.priority)}>
                          {supportTicketPriorityLabel(ticket.priority)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={supportTicketStatusTone(ticket.status)}>
                          {supportTicketStatusLabel(ticket.status)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{ticket.assignedTo?.user?.name || "Unassigned"}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(ticket.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => navigate(`/provost/support-tickets/${ticket.id}`)}>
                            View
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/provost/support-tickets/${ticket.id}`)}>
                            Assign
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/provost/support-tickets/${ticket.id}`)}>
                            Update
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                />
              </div>

              <div className="grid gap-3 md:hidden">
                {items.map((ticket) => (
                  <article key={ticket.id} className="rounded-2xl border border-slate-700/60 bg-bg-card/75 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{ticket.subject}</h3>
                      <StatusBadge tone={supportTicketStatusTone(ticket.status)}>
                        {supportTicketStatusLabel(ticket.status)}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{ticket.student?.user?.name || "N/A"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge tone={supportTicketPriorityTone(ticket.priority)}>
                        {supportTicketPriorityLabel(ticket.priority)}
                      </StatusBadge>
                      <span className="text-xs text-slate-400">{supportTicketCategoryLabel(ticket.category)}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Assignee: {ticket.assignedTo?.user?.name || "Unassigned"}</p>
                    <Button className="mt-3" size="sm" variant="secondary" onClick={() => navigate(`/provost/support-tickets/${ticket.id}`)}>
                      Open Ticket
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

export default ProvostSupportTicketsPage;

