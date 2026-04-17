import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
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

const defaultSummary = {
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  cancelled: 0,
};

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

function ProvostStaffTasksPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: "",
    taskType: "",
    priority: "",
    status: "",
    assignedTo: "",
    startDate: "",
    endDate: "",
    sort: "dueDate:asc",
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
        limit: 200,
        isActive: true,
        sortBy: "name",
        sortOrder: "asc",
      });
      setStaffOptions(result.items || []);
    } catch {
      setStaffOptions([]);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await taskApi.listTasks({
        page,
        limit,
        search: filters.search || undefined,
        taskType: filters.taskType || undefined,
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
      setError(getApiErrorMessage(loadError, "Failed to fetch tasks."));
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.assignedTo,
    filters.endDate,
    filters.priority,
    filters.search,
    filters.startDate,
    filters.status,
    filters.taskType,
    limit,
    page,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const updateFilter = (field, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const summaryItems = [
    { title: "Total", value: String(summary.total), hint: "All tasks", tone: "primary" },
    { title: "Pending", value: String(summary.pending), hint: "Awaiting start", tone: "warning" },
    { title: "In Progress", value: String(summary.inProgress), hint: "Active work", tone: "info" },
    { title: "Completed", value: String(summary.completed), hint: "Finished", tone: "success" },
    { title: "Cancelled", value: String(summary.cancelled), hint: "Stopped", tone: "neutral" },
  ];

  return (
    <DetailPageShell
      eyebrow="Provost Control"
      title="Staff Task Monitoring"
      description="Monitor all assigned tasks, update status, and manage staff workload."
      actions={[
        <Button key="new" onClick={() => navigate("/provost/staff-tasks/new")}>
          <Plus size={16} className="mr-1" />
          Create Task
        </Button>,
      ]}
    >
      <SummaryGrid items={summaryItems} />

      <ContentSection title="Tasks" description="Search, filter, and manage staff tasks.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
            <Input
              className="xl:col-span-2"
              placeholder="Search title, description, room, or staff"
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
            />
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
            <Select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="">All Statuses</option>
              {taskStatusOptions.map((option) => (
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
            <Button variant="secondary" onClick={fetchTasks}>
              Refresh
            </Button>
          </div>

          {isLoading ? <LoadingState label="Loading tasks..." /> : null}
          {!isLoading && error ? (
            <ErrorState title="Unable to load tasks" description={error} actionLabel="Retry" onAction={fetchTasks} />
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            <EmptyState title="No tasks found" description="Try changing filters or create a new task." />
          ) : null}

          {!isLoading && !error && items.length > 0 ? (
            <>
              <div className="hidden md:block">
                <DataTableShell
                  columns={["Title", "Assignee", "Type", "Priority", "Status", "Due", "Actions"]}
                  rows={items}
                  renderRow={(task) => (
                    <tr key={task.id} className="border-b border-slate-800/70 last:border-none">
                      <td className="px-4 py-3 font-medium">{task.title}</td>
                      <td className="px-4 py-3 text-slate-300">{task.assignedTo?.user?.name || "N/A"}</td>
                      <td className="px-4 py-3 text-slate-300">{taskTypeLabel(task.taskType)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={taskPriorityTone(task.priority)}>{taskPriorityLabel(task.priority)}</StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={taskStatusTone(task.status)}>{taskStatusLabel(task.status)}</StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(task.dueDate)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => navigate(`/provost/staff-tasks/${task.id}`)}>
                            View
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/provost/staff-tasks/${task.id}`)}>
                            Edit
                          </Button>
                        </div>
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
                    <p className="mt-1 text-xs text-slate-400">{task.assignedTo?.user?.name || "N/A"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge tone={taskPriorityTone(task.priority)}>{taskPriorityLabel(task.priority)}</StatusBadge>
                      <span className="text-xs text-slate-400">{taskTypeLabel(task.taskType)}</span>
                      <span className="text-xs text-slate-500">Due {formatDate(task.dueDate)}</span>
                    </div>
                    <Button className="mt-3" size="sm" variant="secondary" onClick={() => navigate(`/provost/staff-tasks/${task.id}`)}>
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

export default ProvostStaffTasksPage;

