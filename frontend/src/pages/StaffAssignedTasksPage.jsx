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
import { taskApi } from "@/api/taskApi";
import {
  taskPriorityLabel,
  taskPriorityOptions,
  taskPriorityTone,
  taskStatusLabel,
  taskStatusOptions,
  taskStatusTone,
  taskTypeLabel,
  taskTypeOptions,
} from "@/features/staff-task/constants";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const sortOptions = [
  { label: "Due Date (Soonest)", value: "dueDate:asc" },
  { label: "Due Date (Latest)", value: "dueDate:desc" },
  { label: "Newest", value: "createdAt:desc" },
  { label: "Priority (High First)", value: "priority:desc" },
];

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

function StaffAssignedTasksPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ status: "", taskType: "", priority: "", sort: "dueDate:asc" });
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    overdue: 0,
  });
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortBy, sortOrder] = useMemo(() => filters.sort.split(":"), [filters.sort]);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await taskApi.listAssignedTasks({
        page,
        limit,
        status: filters.status || undefined,
        taskType: filters.taskType || undefined,
        priority: filters.priority || undefined,
        sortBy,
        sortOrder,
      });
      setItems(result.items || []);
      setSummary(result.summary || { total: 0, pending: 0, inProgress: 0, completed: 0, cancelled: 0, overdue: 0 });
      setMeta(result.meta || { page: 1, totalPages: 0, total: 0 });
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to fetch assigned tasks."));
    } finally {
      setIsLoading(false);
    }
  }, [filters.priority, filters.status, filters.taskType, limit, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const summaryItems = [
    { title: "Total", value: String(summary.total), hint: "All assigned tasks", tone: "primary" },
    { title: "Pending", value: String(summary.pending), hint: "Not started", tone: "warning" },
    { title: "In Progress", value: String(summary.inProgress), hint: "Ongoing", tone: "info" },
    { title: "Completed", value: String(summary.completed), hint: "Finished", tone: "success" },
    { title: "Overdue", value: String(summary.overdue || 0), hint: "Past due date", tone: "danger" },
  ];

  const updateFilter = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <DetailPageShell
      eyebrow="Staff Workspace"
      title="My Assigned Tasks"
      description="Track assigned hall operations tasks and update your progress."
    >
      <SummaryGrid items={summaryItems} />

      <ContentSection title="Assigned Tasks" description="Filter and open a task to update work progress.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="">All Statuses</option>
              {taskStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.taskType} onChange={(event) => updateFilter("taskType", event.target.value)}>
              <option value="">All Task Types</option>
              {taskTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select value={filters.priority} onChange={(event) => updateFilter("priority", event.target.value)}>
              <option value="">All Priorities</option>
              {taskPriorityOptions.map((option) => (
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

          {isLoading ? <LoadingState label="Loading assigned tasks..." /> : null}
          {!isLoading && error ? (
            <ErrorState title="Unable to load tasks" description={error} actionLabel="Retry" onAction={fetchTasks} />
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            <EmptyState title="No assigned tasks" description="Tasks assigned to you will appear here." />
          ) : null}

          {!isLoading && !error && items.length > 0 ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={["Title", "Type", "Priority", "Status", "Room", "Due Date", "Actions"]}
                  rows={items}
                  renderRow={(task) => (
                    <tr key={task.id} className="border-b border-slate-800/70 last:border-none">
                      <td className="px-4 py-3 font-medium">{task.title}</td>
                      <td className="px-4 py-3 text-slate-300">{taskTypeLabel(task.taskType)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={taskPriorityTone(task.priority)}>
                          {taskPriorityLabel(task.priority)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={taskStatusTone(task.status)}>
                          {taskStatusLabel(task.status)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{task.room?.roomNumber || "N/A"}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(task.dueDate)}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/staff/assigned-tasks/${task.id}`)}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  )}
                />
              </div>

              <div className="grid gap-3 md:hidden">
                {items.map((task) => (
                  <article key={task.id} className="rounded-2xl border border-slate-700/60 bg-bg-card/75 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{task.title}</h3>
                      <StatusBadge tone={taskStatusTone(task.status)}>{taskStatusLabel(task.status)}</StatusBadge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge tone={taskPriorityTone(task.priority)}>{taskPriorityLabel(task.priority)}</StatusBadge>
                      <span className="text-xs text-slate-400">{taskTypeLabel(task.taskType)}</span>
                      <span className="text-xs text-slate-500">Due {formatDate(task.dueDate)}</span>
                    </div>
                    <Button className="mt-3" size="sm" variant="secondary" onClick={() => navigate(`/staff/assigned-tasks/${task.id}`)}>
                      Open Task
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

export default StaffAssignedTasksPage;

