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

const sortOptions = [
  { label: "Newest", value: "createdAt:desc" },
  { label: "Oldest", value: "createdAt:asc" },
  { label: "Priority (High First)", value: "priority:desc" },
  { label: "Status (A-Z)", value: "status:asc" },
];

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

function StudentSupportTicketsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    status: "",
    category: "",
    priority: "",
    sort: "createdAt:desc",
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await supportTicketApi.listMyTickets({
        page,
        limit,
        status: filters.status || undefined,
        category: filters.category || undefined,
        priority: filters.priority || undefined,
        sortBy,
        sortOrder,
      });
      setItems(result.items || []);
      setSummary(result.summary || { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to fetch support tickets."));
    } finally {
      setIsLoading(false);
    }
  }, [filters.category, filters.priority, filters.status, limit, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const summaryItems = [
    { title: "Total", value: String(summary.total), hint: "All tickets", tone: "primary" },
    { title: "Open", value: String(summary.open), hint: "New tickets", tone: "warning" },
    { title: "In Progress", value: String(summary.inProgress), hint: "Under review", tone: "info" },
    { title: "Resolved", value: String(summary.resolved), hint: "Resolved tickets", tone: "success" },
  ];

  const updateFilter = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <DetailPageShell
      eyebrow="Student Workspace"
      title="My Support Tickets"
      description="Track your support requests and open any ticket to continue the conversation."
      actions={[
        <Button key="new" onClick={() => navigate("/student/support-tickets/new")}>
          <Plus size={16} className="mr-1" />
          New Ticket
        </Button>,
      ]}
    >
      <SummaryGrid items={summaryItems} />

      <ContentSection title="Ticket History" description="Review support tickets submitted by you.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="">All Statuses</option>
              {supportTicketStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

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

            <Select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {isLoading ? <LoadingState label="Loading support tickets..." /> : null}
          {!isLoading && error ? (
            <ErrorState title="Unable to load tickets" description={error} actionLabel="Retry" onAction={fetchTickets} />
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            <EmptyState
              title="No support tickets yet"
              description="Submit a support ticket if you need help with hall or university-related issues."
              actionLabel="Create Ticket"
              onAction={() => navigate("/student/support-tickets/new")}
            />
          ) : null}

          {!isLoading && !error && items.length > 0 ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={["Subject", "Category", "Priority", "Status", "Assigned", "Date", "Actions"]}
                  rows={items}
                  renderRow={(ticket) => (
                    <tr key={ticket.id} className="border-b border-slate-800/70 last:border-none">
                      <td className="px-4 py-3 font-medium">{ticket.subject}</td>
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
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/student/support-tickets/${ticket.id}`)}>
                          View
                        </Button>
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
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge tone={supportTicketPriorityTone(ticket.priority)}>
                        {supportTicketPriorityLabel(ticket.priority)}
                      </StatusBadge>
                      <span className="text-xs text-slate-400">{supportTicketCategoryLabel(ticket.category)}</span>
                      <span className="text-xs text-slate-500">{formatDate(ticket.createdAt)}</span>
                    </div>
                    <Button className="mt-3" size="sm" variant="secondary" onClick={() => navigate(`/student/support-tickets/${ticket.id}`)}>
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

export default StudentSupportTicketsPage;

